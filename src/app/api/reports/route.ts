import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

async function authenticate(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticate(request);
    if (!decoded) return NextResponse.json({ error: 'Tidak terautentikasi' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const onlyTaxInvoice = searchParams.get('onlyTaxInvoice') === 'true';

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // All invoices
    const allInvoices = await db.invoice.findMany({ include: { customer: true, items: true } });
    const allExpenses = await db.expense.findMany();
    const customers = await db.customer.findMany();

    // KPIs
    const totalIncome = allInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
    const totalExpense = allExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalIncome - totalExpense;
    const totalReceivable = allInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0);
    const activeCustomers = customers.filter(c => c.status === 'active').length;

    // Month income/expense
    const monthInvoices = allInvoices.filter(i => {
      const d = new Date(i.issueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthExpenses = allExpenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const invoiceCountThisMonth = monthInvoices.length;
    const incomeThisMonth = monthInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
    const expenseThisMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Monthly data for charts (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(currentYear, currentMonth - i, 1);
      const m = mDate.getMonth();
      const y = mDate.getFullYear();
      const mIncome = allInvoices
        .filter(inv => {
          const d = new Date(inv.issueDate);
          return d.getMonth() === m && d.getFullYear() === y && inv.status === 'paid';
        })
        .reduce((s, inv) => s + inv.total, 0);
      const mExpense = allExpenses
        .filter(exp => {
          const d = new Date(exp.date);
          return d.getMonth() === m && d.getFullYear() === y;
        })
        .reduce((s, exp) => s + exp.amount, 0);
      monthlyData.push({
        month: mDate.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        income: mIncome,
        expense: mExpense,
        profit: mIncome - mExpense,
      });
    }

    // Expense by category
    const expenseCategories = [
      'operasional', 'bbm', 'pestisida', 'gaji', 'lainnya'
    ];
    const expenseByCategory = expenseCategories.map(cat => ({
      category: cat,
      total: allExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    }));

    // Receivable by customer
    const receivableByCustomer = customers.map(c => {
      const custInvoices = allInvoices.filter(i => i.customerId === c.id && i.status !== 'paid');
      return {
        customerName: c.companyName,
        total: custInvoices.reduce((s, i) => s + i.total, 0),
        invoiceCount: custInvoices.length,
      };
    }).filter(c => c.total > 0);

    return NextResponse.json({
      kpis: {
        totalIncome,
        totalExpense,
        netProfit,
        totalReceivable,
        activeCustomers,
        invoiceCountThisMonth,
        incomeThisMonth,
        expenseThisMonth,
      },
      monthlyData,
      expenseByCategory,
      receivableByCustomer,
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
