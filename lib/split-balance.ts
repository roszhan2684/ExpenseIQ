import type { IGroupMember } from './models/SplitGroup';
import type { ISplitExpense } from './models/SplitExpense';

export interface NetBalance {
  memberId: string;
  memberName: string;
  net: number;   // positive = owed money, negative = owes money
}

export interface Debt {
  from: string;    // memberId who owes
  fromName: string;
  to: string;      // memberId who is owed
  toName: string;
  amount: number;
}

/** Compute how much each member is owed (positive) or owes (negative) */
export function computeNetBalances(
  members: IGroupMember[],
  expenses: ISplitExpense[],
): NetBalance[] {
  const net: Record<string, number> = {};
  for (const m of members) net[m.id] = 0;

  for (const exp of expenses) {
    if (exp.type === 'expense') {
      // Payer gets credit for the full amount
      net[exp.paidBy] = (net[exp.paidBy] ?? 0) + exp.amount;
      // Each member is debited their share
      for (const split of exp.splits) {
        net[split.memberId] = (net[split.memberId] ?? 0) - split.amount;
      }
    } else {
      // Settlement: paidBy sent money → their debt reduces
      // The recipient (first split) gets debited (their owed balance reduces)
      net[exp.paidBy] = (net[exp.paidBy] ?? 0) + exp.amount;
      if (exp.splits[0]) {
        net[exp.splits[0].memberId] = (net[exp.splits[0].memberId] ?? 0) - exp.amount;
      }
    }
  }

  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  return Object.entries(net).map(([memberId, n]) => ({
    memberId,
    memberName: memberMap.get(memberId) ?? memberId,
    net: Math.round(n * 100) / 100,
  }));
}

/**
 * Simplify debts to minimum transactions using greedy two-pointer algorithm.
 * Invariant: sum of all nets = 0 (expenses balance out).
 */
export function simplifyDebts(balances: NetBalance[]): Debt[] {
  const creditors = balances
    .filter((b) => b.net > 0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);
  const debtors = balances
    .filter((b) => b.net < -0.005)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);

  const debts: Debt[] = [];
  let i = 0, j = 0;

  while (i < creditors.length && j < debtors.length) {
    const credit = creditors[i];
    const debt = debtors[j];
    const amount = Math.min(credit.net, -debt.net);
    if (amount > 0.005) {
      debts.push({
        from: debt.memberId,
        fromName: debt.memberName,
        to: credit.memberId,
        toName: credit.memberName,
        amount: Math.round(amount * 100) / 100,
      });
    }
    credit.net -= amount;
    debt.net += amount;
    if (Math.abs(credit.net) < 0.005) i++;
    if (Math.abs(debt.net) < 0.005) j++;
  }

  return debts;
}

/** Full pipeline: expenses → simplified debt list */
export function getGroupDebts(
  members: IGroupMember[],
  expenses: ISplitExpense[],
): { balances: NetBalance[]; debts: Debt[] } {
  const balances = computeNetBalances(members, expenses);
  const debts = simplifyDebts(balances);
  return { balances, debts };
}
