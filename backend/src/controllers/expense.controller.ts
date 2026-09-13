import { Request, Response, NextFunction } from 'express';
import Expense from '../models/Expense';

export async function addExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { description, amount, date } = req.body;

    if (!description || !amount || amount <= 0) {
      res.status(400).json({ message: 'يرجى إدخال سبب المصروف والمبلغ بشكل صحيح' });
      return;
    }

    const expenseDate = date ? new Date(date) : new Date();
    const dYear = expenseDate.getFullYear();
    const dMonth = expenseDate.getMonth() + 1;
    const monthStr = dMonth < 10 ? `0${dMonth}` : `${dMonth}`;
    const dayStr = expenseDate.getDate() < 10 ? `0${expenseDate.getDate()}` : `${expenseDate.getDate()}`;
    const dateStr = `${dYear}-${monthStr}-${dayStr}`;

    const newExpense = await Expense.create({
      description,
      amount: Number(amount),
      date: dateStr,
      year: dYear,
      month: dMonth,
    });

    res.status(201).json(newExpense);
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function getExpensesByMonth(req: Request, res: Response, next: NextFunction) {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1);

    const expenses = await Expense.find({ year, month }).sort({ createdAt: 1 });
    res.status(200).json(expenses);
    return;
  } catch (error) {
    next(error);
    return;
  }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await Expense.findByIdAndDelete(id);
    res.status(200).json({ message: 'تم مسح المصروف بنجاح' });
    return;
  } catch (error) {
    next(error);
    return;
  }
}
