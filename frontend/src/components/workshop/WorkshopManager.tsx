import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Plus,
  TrendingUp,
  Receipt,
  PieChart,
  Building,
  CheckCircle2,
  Trash2,
  Edit2,
  Camera,
  Check,
  AlertCircle,
  Users,
  Sparkles,
  Scale,
  UserPlus,
  Hammer,
  Layers,
  Search,
  Share2,
} from 'lucide-react';
import type {
  WorkshopExpense,
  ProfitShareDistribution,
  Owner,
  ProfitShareRecipient,
  StaffMember,
} from '../../types';
import { formatToman, toPersianDigits, toJalaliDate, numberToWordsPersian } from '../../utils/persian';
import { Modal } from '../common/Modal';

interface WorkshopManagerProps {
  owners: Owner[];
  staff?: StaffMember[];
  totalActiveDebt?: number;
  todayPayments?: number;
}

export const WorkshopManager: React.FC<WorkshopManagerProps> = ({
  owners = [],
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'distribution' | 'settlement' | 'maintenance'>('expenses');
  const [expenses, setExpenses] = useState<WorkshopExpense[]>([]);
  const [profitDistributions, setProfitDistributions] = useState<ProfitShareDistribution[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search & Filters for Expenses
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedPayerFilter, setSelectedPayerFilter] = useState<string>('all');

  // Expense Modal States
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<WorkshopExpense | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WorkshopExpense['category']>('machinery_maintenance');
  const [categoryLabel, setCategoryLabel] = useState('تعمیر و استهلاک چرخ‌ها و تجهیزات');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState('صندوق کارگاه');
  const [paymentMethod, setPaymentMethod] = useState<WorkshopExpense['paymentMethod']>('card');
  const [costAllocation, setCostAllocation] = useState<WorkshopExpense['costAllocation']>('shared_by_equity');
  const [receiptImage, setReceiptImage] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Distribution Calculator Modal / Work Area
  const [isDistModalOpen, setIsDistModalOpen] = useState(false);
  const [periodTitle, setPeriodTitle] = useState('دوره تسویه و تسهیم سود جاری کارگاه');
  const [grossRevenueInput, setGrossRevenueInput] = useState('120000000');
  const [totalExpensesInput, setTotalExpensesInput] = useState('45000000');
  const [reinvestmentReserveInput, setReinvestmentReserveInput] = useState('15000000');
  const [distributionMode, setDistributionMode] = useState<'units' | 'percentage'>('units');
  const [distributionNotes, setDistributionNotes] = useState('');
  
  // Custom Recipients in the Distribution Engine
  const [recipients, setRecipients] = useState<ProfitShareRecipient[]>([
    {
      id: 'rec-1',
      name: 'محمد',
      role: 'هم‌بنیان‌گذار و مدیر تولید',
      type: 'owner',
      shareUnits: 1,
      percentage: 20,
      bankCard: '6104-3378-9012-3456',
      bankSheba: 'IR120120000000006104337890',
      phone: '09121112233',
    },
    {
      id: 'rec-2',
      name: 'امین',
      role: 'هم‌بنیان‌گذار و مدیر مالی و بازار',
      type: 'owner',
      shareUnits: 1,
      percentage: 20,
      bankCard: '5022-2910-1234-9876',
      bankSheba: 'IR330570000000005022291012',
      phone: '09122223344',
    },
    {
      id: 'rec-3',
      name: 'کادر دوزندگی، برش‌کاران و پاداش پرسنل',
      role: 'صندوق انگیزش و کارانه تولید',
      type: 'staff_pool',
      shareUnits: 1,
      percentage: 20,
      bankCard: '6104-3375-1122-3344',
      phone: '09127778899',
    },
    {
      id: 'rec-4',
      name: 'صندوق بهسازی، نگهداری و متریال کارگاه',
      role: 'ذخیره توسعه تجهیزات و سرمایه در گردش',
      type: 'workshop_fund',
      shareUnits: 1,
      percentage: 20,
    },
    {
      id: 'rec-5',
      name: 'سرمایه‌گذار خارج از کارگاه (تامین پارچه)',
      role: 'سرمایه‌گذار مالی و بازدهی سرمایه',
      type: 'investor',
      shareUnits: 1,
      percentage: 20,
      bankCard: '6219-8610-9988-7766',
      bankSheba: 'IR980560000000006219861099',
      phone: '09123456780',
    },
  ]);
  // Category Configuration Mapping
  const categoryOptions = [
    {
      id: 'machinery_maintenance',
      label: 'تعمیر، سرویس و استهلاک چرخ‌ها',
      icon: Wrench,
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
    {
      id: 'materials_supplies',
      label: 'ملزومات، پارچه و خرج‌کار مصرفی',
      icon: Layers,
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    },
    {
      id: 'workshop_improvement',
      label: 'توسعه، بهسازی و تجهیزات سالن',
      icon: Hammer,
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    },
    {
      id: 'rent',
      label: 'اجاره سالن کارگاه و انبار',
      icon: Building,
      badgeColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    },
    {
      id: 'utilities',
      label: 'قبوض آب، برق صنعتی و گاز',
      icon: TrendingUp,
      badgeColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'tools_equipment',
      label: 'ابزارآلات، قیچی برقی و اتو بخار',
      icon: ScissorsIcon,
      badgeColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    },
    {
      id: 'staff_bonus',
      label: 'پاداش و اضافه‌کاری دوزندگان',
      icon: Users,
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'other',
      label: 'سایر هزینه‌های متفرقه کارگاه',
      icon: Receipt,
      badgeColor: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-500/30',
    },
  ];

  function ScissorsIcon(props: React.SVGProps<SVGSVGElement>) {
    return <Wrench {...props} />;
  }

  const fetchWorkshopData = async () => {
    try {
      setIsLoading(true);
      const [expRes, profitRes] = await Promise.all([
        fetch('/api/expenses').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/profit-distribution').then((r) => (r.ok ? r.json() : [])),
      ]);
      setExpenses(expRes);
      setProfitDistributions(profitRes);

      // Auto populate total expenses in calculator
      const sumExp = expRes.reduce((s: number, e: WorkshopExpense) => s + (e.amount || 0), 0);
      if (sumExp > 0) {
        setTotalExpensesInput(String(sumExp));
      }
    } catch (err) {
      console.error('Error fetching workshop data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkshopData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // ----------------------------------------------------
  // Expense Form Actions
  // ----------------------------------------------------
  const handleOpenNewExpense = (presetCategory?: WorkshopExpense['category']) => {
    setEditingExpense(null);
    setTitle('');
    const targetCat = presetCategory || 'machinery_maintenance';
    setCategory(targetCat);
    const catObj = categoryOptions.find((c) => c.id === targetCat);
    setCategoryLabel(catObj ? catObj.label : 'هزینه کارگاه');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidBy(owners?.[0]?.name ? `${owners[0].name} (هم‌بنیان‌گذار)` : 'صندوق کارگاه');
    setPaymentMethod('card');
    setCostAllocation('shared_by_equity');
    setReceiptImage('');
    setDescription('');
    setIsRecurring(false);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: WorkshopExpense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setCategoryLabel(exp.categoryLabel || '');
    setAmount(String(exp.amount));
    setDate(exp.date);
    setPaidBy(exp.paidBy);
    setPaymentMethod(exp.paymentMethod);
    setCostAllocation(exp.costAllocation || 'shared_by_equity');
    setReceiptImage(exp.receiptImageUrl || '');
    setDescription(exp.description || '');
    setIsRecurring(Boolean(exp.isRecurring));
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    const payload = {
      title: title.trim(),
      category,
      categoryLabel,
      amount: Number(amount) || 0,
      date,
      paidBy,
      paymentMethod,
      costAllocation,
      receiptImageUrl: receiptImage,
      description: description.trim(),
      isRecurring,
    };

    try {
      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setExpenses((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        }
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setExpenses((prev) => [created, ...prev]);
        }
      }
      setIsExpenseModalOpen(false);
    } catch (err) {
      console.error('Failed to save expense', err);
    }
  };

  const handleDeleteExpense = async (id: string, expTitle: string) => {
    if (confirm(`آیا از انتقال هزینه "${expTitle}" به سطل بازیافت اطمینان دارید؟`)) {
      try {
        const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setExpenses((prev) => prev.filter((e) => e.id !== id));
        }
      } catch (err) {
        console.error('Failed to delete expense', err);
      }
    }
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setReceiptImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // ----------------------------------------------------
  // Distribution Presets & Logic
  // ----------------------------------------------------
  const applyPreset = (presetName: '5_parts' | '50_50' | '4_parts') => {
    if (presetName === '5_parts') {
      setDistributionMode('units');
      setRecipients([
        {
          id: 'rec-1',
          name: owners[0]?.name || 'محمد',
          role: 'هم‌بنیان‌گذار و مدیر تولید',
          type: 'owner',
          shareUnits: 1,
          percentage: 20,
          bankCard: owners[0]?.bankAccounts?.[0]?.cardNumber || '6104-3378-9012-3456',
          bankSheba: owners[0]?.bankAccounts?.[0]?.shebaNumber || 'IR120120000000006104337890',
          phone: owners[0]?.phones?.[0] || '09121112233',
        },
        {
          id: 'rec-2',
          name: owners[1]?.name || 'امین',
          role: 'هم‌بنیان‌گذار و مدیر مالی و بازار',
          type: 'owner',
          shareUnits: 1,
          percentage: 20,
          bankCard: owners[1]?.bankAccounts?.[0]?.cardNumber || '5022-2910-1234-9876',
          bankSheba: owners[1]?.bankAccounts?.[0]?.shebaNumber || 'IR330570000000005022291012',
          phone: owners[1]?.phones?.[0] || '09122223344',
        },
        {
          id: 'rec-3',
          name: 'کادر دوزندگی، برش‌کاران و پاداش پرسنل',
          role: 'صندوق انگیزش و کارانه تولید',
          type: 'staff_pool',
          shareUnits: 1,
          percentage: 20,
          bankCard: '6104-3375-1122-3344',
          phone: '09127778899',
        },
        {
          id: 'rec-4',
          name: 'صندوق بهسازی، نگهداری و متریال کارگاه',
          role: 'ذخیره توسعه تجهیزات و سرمایه در گردش',
          type: 'workshop_fund',
          shareUnits: 1,
          percentage: 20,
        },
        {
          id: 'rec-5',
          name: 'سرمایه‌گذار خارج از کارگاه (تامین پارچه)',
          role: 'سرمایه‌گذار مالی و بازدهی سرمایه',
          type: 'investor',
          shareUnits: 1,
          percentage: 20,
          bankCard: '6219-8610-9988-7766',
          bankSheba: 'IR980560000000006219861099',
          phone: '09123456780',
        },
      ]);
    } else if (presetName === '50_50') {
      setDistributionMode('units');
      setRecipients([
        {
          id: 'rec-1',
          name: owners[0]?.name || 'محمد',
          role: 'هم‌بنیان‌گذار و مدیر تولید',
          type: 'owner',
          shareUnits: 1,
          percentage: 50,
          bankCard: owners[0]?.bankAccounts?.[0]?.cardNumber || '6104-3378-9012-3456',
          bankSheba: owners[0]?.bankAccounts?.[0]?.shebaNumber || 'IR120120000000006104337890',
          phone: owners[0]?.phones?.[0] || '09121112233',
        },
        {
          id: 'rec-2',
          name: owners[1]?.name || 'امین',
          role: 'هم‌بنیان‌گذار و مدیر مالی و بازار',
          type: 'owner',
          shareUnits: 1,
          percentage: 50,
          bankCard: owners[1]?.bankAccounts?.[0]?.cardNumber || '5022-2910-1234-9876',
          bankSheba: owners[1]?.bankAccounts?.[0]?.shebaNumber || 'IR330570000000005022291012',
          phone: owners[1]?.phones?.[0] || '09122223344',
        },
      ]);
    } else if (presetName === '4_parts') {
      setDistributionMode('units');
      setRecipients([
        {
          id: 'rec-1',
          name: owners[0]?.name || 'محمد',
          role: 'هم‌بنیان‌گذار (سهم ۱ از ۴)',
          type: 'owner',
          shareUnits: 1,
          percentage: 25,
          bankCard: owners[0]?.bankAccounts?.[0]?.cardNumber || '',
          bankSheba: owners[0]?.bankAccounts?.[0]?.shebaNumber || '',
        },
        {
          id: 'rec-2',
          name: owners[1]?.name || 'امین',
          role: 'هم‌بنیان‌گذار (سهم ۱ از ۴)',
          type: 'owner',
          shareUnits: 1,
          percentage: 25,
          bankCard: owners[1]?.bankAccounts?.[0]?.cardNumber || '',
          bankSheba: owners[1]?.bankAccounts?.[0]?.shebaNumber || '',
        },
        {
          id: 'rec-3',
          name: 'پاداش و کارانه پرسنل و خیاطان',
          role: 'تیم دوزندگی',
          type: 'staff_pool',
          shareUnits: 1,
          percentage: 25,
        },
        {
          id: 'rec-4',
          name: 'صندوق بهسازی و نگهداری کارگاه',
          role: 'توسعه و استهلاک',
          type: 'workshop_fund',
          shareUnits: 1,
          percentage: 25,
        },
      ]);
    }
  };

  const handleAddRecipient = () => {
    const newId = `rec-${Date.now()}`;
    setRecipients((prev) => [
      ...prev,
      {
        id: newId,
        name: `ذی‌نفع جدید ${toPersianDigits(prev.length + 1)}`,
        role: 'شریک / سرمایه‌گذار / پرسنل',
        type: 'custom',
        shareUnits: 1,
        percentage: 10,
        isCustomRecipient: true,
      },
    ]);
  };

  const handleRemoveRecipient = (id: string) => {
    if (recipients.length <= 1) return;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRecipient = (id: string, updates: Partial<ProfitShareRecipient>) => {
    setRecipients((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  // Calculations for current simulator
  const numGross = Number(grossRevenueInput) || 0;
  const numExp = Number(totalExpensesInput) || 0;
  const numReserve = Number(reinvestmentReserveInput) || 0;
  const netProfitCalculated = Math.max(0, numGross - numExp - numReserve);

  const totalShareUnitsCount = recipients.reduce((sum, r) => sum + (Number(r.shareUnits) || 0), 0);

  // Compute calculated amounts for recipients
  const computedRecipients = useMemo(() => {
    if (distributionMode === 'units') {
      const totalUnits = totalShareUnitsCount > 0 ? totalShareUnitsCount : 1;
      return recipients.map((r) => {
        const unit = Number(r.shareUnits) || 0;
        const pct = Math.round((unit / totalUnits) * 1000) / 10;
        const assigned = Math.round((netProfitCalculated * unit) / totalUnits);
        return {
          ...r,
          percentage: pct,
          assignedAmount: assigned,
        };
      });
    } else {
      const totalPct = recipients.reduce((s, r) => s + (Number(r.percentage) || 0), 0) || 100;
      return recipients.map((r) => {
        const pct = Number(r.percentage) || 0;
        const assigned = Math.round((netProfitCalculated * pct) / totalPct);
        return {
          ...r,
          percentage: pct,
          assignedAmount: assigned,
        };
      });
    }
  }, [recipients, distributionMode, totalShareUnitsCount, netProfitCalculated]);

  const handleSaveDistribution = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: ProfitShareDistribution = {
      id: `prd-${Date.now()}`,
      periodName: periodTitle.trim(),
      startDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      grossRevenue: numGross,
      totalExpenses: numExp,
      reinvestmentReserve: numReserve,
      netProfit: netProfitCalculated,
      distributionMode,
      totalShareUnits: totalShareUnitsCount,
      recipients: computedRecipients,
      notes: distributionNotes.trim(),
      status: 'approved',
      calculatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch('/api/profit-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        setProfitDistributions((prev) => [created, ...prev]);
        setIsDistModalOpen(false);
        setActiveSubTab('distribution');
      }
    } catch (err) {
      console.error('Failed to save distribution', err);
    }
  };

  // ----------------------------------------------------
  // Cost Contribution & Settlement Calculations ("چه کسی چقدر باید بپردازد؟")
  // ----------------------------------------------------
  // Aggregate expenses paid by each individual from personal funds vs fund
  const totalWorkshopExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalImprovementExpenses = expenses
    .filter((e) => e.category === 'workshop_improvement' || e.category === 'machinery_maintenance' || e.category === 'tools_equipment')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const totalMaterialExpenses = expenses
    .filter((e) => e.category === 'materials_supplies')
    .reduce((s, e) => s + (e.amount || 0), 0);

  // Settlement Balance Table for Owners & Beneficiaries
  const settlementBalances = useMemo(() => {
    const owner1 = owners[0]?.name || 'محمد';
    const owner2 = owners[1]?.name || 'امین';

    // Amount paid out of pocket by each owner:
    const paidByOwner1 = expenses
      .filter((e) => e.paidBy.includes(owner1))
      .reduce((s, e) => s + (e.amount || 0), 0);

    const paidByOwner2 = expenses
      .filter((e) => e.paidBy.includes(owner2))
      .reduce((s, e) => s + (e.amount || 0), 0);

    const paidByFund = expenses
      .filter((e) => e.paidBy.includes('صندوق'))
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Shared costs allocated 50-50 between Mohammad and Amin (or according to their ratio)
    const sharedExpenses = expenses
      .filter((e) => e.costAllocation === 'shared_by_equity' || !e.costAllocation)
      .reduce((s, e) => s + (e.amount || 0), 0);

    const requiredObligationPerOwner = Math.round(sharedExpenses / 2);

    // Profit share from most recent approved distribution
    const latestDist = profitDistributions[0];
    const profitOwner1 = latestDist?.recipients?.find((r) => r.name.includes(owner1))?.assignedAmount || 0;
    const profitOwner2 = latestDist?.recipients?.find((r) => r.name.includes(owner2))?.assignedAmount || 0;

    // Net settlement balance:
    // (Profit to receive) + (Paid from own pocket) - (Share of costs they owe)
    const netOwner1 = profitOwner1 + paidByOwner1 - requiredObligationPerOwner;
    const netOwner2 = profitOwner2 + paidByOwner2 - requiredObligationPerOwner;

    return {
      sharedExpenses,
      paidByFund,
      owner1: {
        name: owner1,
        role: 'هم‌بنیان‌گذار و مدیر تولید',
        bankCard: owners[0]?.bankAccounts?.[0]?.cardNumber || '6104-3378-9012-3456',
        bankSheba: owners[0]?.bankAccounts?.[0]?.shebaNumber || 'IR120120000000006104337890',
        phone: owners[0]?.phones?.[0] || '09121112233',
        paidOutOfPocket: paidByOwner1,
        costObligation: requiredObligationPerOwner,
        profitShare: profitOwner1,
        netBalance: netOwner1,
        status: netOwner1 >= 0 ? 'creditor' : 'debtor',
      },
      owner2: {
        name: owner2,
        role: 'هم‌بنیان‌گذار و مدیر مالی و بازار',
        bankCard: owners[1]?.bankAccounts?.[0]?.cardNumber || '5022-2910-1234-9876',
        bankSheba: owners[1]?.bankAccounts?.[0]?.shebaNumber || 'IR330570000000005022291012',
        phone: owners[1]?.phones?.[0] || '09122223344',
        paidOutOfPocket: paidByOwner2,
        costObligation: requiredObligationPerOwner,
        profitShare: profitOwner2,
        netBalance: netOwner2,
        status: netOwner2 >= 0 ? 'creditor' : 'debtor',
      },
    };
  }, [expenses, owners, profitDistributions]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        e.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.paidBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchCat = selectedCategoryFilter === 'all' || e.category === selectedCategoryFilter;
      const matchPayer =
        selectedPayerFilter === 'all' ||
        (selectedPayerFilter === 'fund' && e.paidBy.includes('صندوق')) ||
        (selectedPayerFilter === 'mohammad' && e.paidBy.includes('محمد')) ||
        (selectedPayerFilter === 'amin' && e.paidBy.includes('امین'));

      return matchSearch && matchCat && matchPayer;
    });
  }, [expenses, searchTerm, selectedCategoryFilter, selectedPayerFilter]);

  return (
    <div className="space-y-6 text-stone-900 dark:text-white" dir="rtl">
      {/* Top Header Card */}
      <div className="glass-panel p-4 sm:p-6 rounded-2xl shadow-xl space-y-4 border border-stone-200 dark:border-white/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#CEAE80] text-black flex items-center justify-center shadow-lg font-black shrink-0 ring-4 ring-[#CEAE80]/20">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-stone-900 dark:text-white tracking-tight">
                  مدیریت هزینه‌ها و درآمد کارگاه
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#CEAE80]/20 text-[#A67C38] dark:text-[#CEAE80] text-[10px] font-black border border-[#CEAE80]/30">
                  محاسبه سود، درآمد و سهم‌بندی
                </span>
              </div>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed">
                ردیابی درآمدهای حاصل از فروش، هزینه‌های نگهداری چرخ‌ها، متریال، سهم هر شریک از هزینه‌ها و محاسبه سهم سود
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={() => {
                setIsDistModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <PieChart className="w-4 h-4" />
              <span>محاسبه و تقسیم سود</span>
            </button>

            <button
              onClick={() => handleOpenNewExpense()}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت هزینه جدید</span>
            </button>
          </div>
        </div>

        {/* 4 Responsive KPI Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Card 1: Total Expenses */}
          <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
              <span>مجموع هزینه‌های کارگاه:</span>
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
              {formatToman(totalWorkshopExpenses)}
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
              {toPersianDigits(expenses.length)} فاکتور ثبت شده
            </div>
          </div>

          {/* Card 2: Improvement & Maintenance */}
          <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
              <span>بهسازی، تجهیز و چرخ‌ها:</span>
              <Wrench className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 font-mono" dir="ltr">
              {formatToman(totalImprovementExpenses)}
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
              سرویس، تیغ، قیچی و قفسه‌بندی
            </div>
          </div>

          {/* Card 3: Materials & Supplies */}
          <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
              <span>پارچه، خرج‌کار و ملزومات:</span>
              <Layers className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
              {formatToman(totalMaterialExpenses)}
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
              نخ، لایی، دکمه و طاقه‌های مصرفی
            </div>
          </div>

          {/* Card 4: 5-Part Model Status */}
          <div className="p-3.5 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5 space-y-1">
            <div className="flex items-center justify-between text-stone-500 dark:text-stone-400 text-xs">
              <span>مدل تسهیم پیش‌فرض:</span>
              <PieChart className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
              ۵ قسمتی (سهم ۲ شریک + ۳ کادر/صندوق)
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
              هر سهم معادل ۲۰٪ از سود خالص
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-200 dark:border-white/10 no-scrollbar">
        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeSubTab === 'expenses'
              ? 'bg-[#CEAE80] text-black shadow-md'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
          }`}
        >
          <Receipt className="w-4 h-4 shrink-0" />
          <span>هزینه‌ها و فاکتورهای کارگاه ({toPersianDigits(expenses.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('settlement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeSubTab === 'settlement'
              ? 'bg-[#CEAE80] text-black shadow-md'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>تراز سهم هر شریک از مخارج («چه کسی چقدر باید بدهد؟»)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('distribution')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeSubTab === 'distribution'
              ? 'bg-[#CEAE80] text-black shadow-md'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
          }`}
        >
          <PieChart className="w-4 h-4 shrink-0" />
          <span>تاریخچه و اسناد تقسیم سود ({toPersianDigits(profitDistributions.length)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('maintenance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black whitespace-nowrap transition-all ${
            activeSubTab === 'maintenance'
              ? 'bg-[#CEAE80] text-black shadow-md'
              : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 font-bold'
          }`}
        >
          <Hammer className="w-4 h-4 shrink-0" />
          <span>بهسازی، سرویس چرخ‌ها و ملزومات</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: EXPENSES LIST & FORMS */}
      {/* ======================================================== */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="glass-panel p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-stone-200 dark:border-white/5">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute right-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="جستجو در عنوان، کد یا پرداخت‌کننده..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80] bg-transparent"
              >
                <option value="all" className="bg-stone-900 text-white">همه دسته‌بندی‌ها</option>
                {categoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-stone-900 text-white">
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedPayerFilter}
                onChange={(e) => setSelectedPayerFilter(e.target.value)}
                className="px-3 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80] bg-transparent"
              >
                <option value="all" className="bg-stone-900 text-white">همه پرداخت‌کنندگان</option>
                <option value="fund" className="bg-stone-900 text-white">صندوق تنخواه کارگاه</option>
                <option value="mohammad" className="bg-stone-900 text-white">محمد (هم‌بنیان‌گذار)</option>
                <option value="amin" className="bg-stone-900 text-white">امین (هم‌بنیان‌گذار)</option>
              </select>
            </div>
          </div>

          {/* Expense Cards Grid (Mobile-First) */}
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-stone-300 dark:border-white/10 text-stone-500 dark:text-stone-400 space-y-3">
              <Receipt className="w-10 h-10 mx-auto text-stone-400 opacity-50" />
              <p className="text-sm font-bold">هیچ هزینه‌ای با مشخصات انتخابی یافت نشد.</p>
              <button
                onClick={() => handleOpenNewExpense()}
                className="px-4 py-2 rounded-xl bg-[#CEAE80] text-black font-black text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                ثبت اولین هزینه کارگاه
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredExpenses.map((exp) => {
                const catInfo = categoryOptions.find((c) => c.id === exp.category);
                const IconComponent = catInfo?.icon || Receipt;

                return (
                  <div
                    key={exp.id}
                    className="glass-card p-4 rounded-2xl hover:border-[#CEAE80]/40 transition-all flex flex-col justify-between space-y-3 border border-stone-200 dark:border-white/5 shadow-sm"
                  >
                    <div>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#CEAE80]/15 flex items-center justify-center text-[#A67C38] dark:text-[#CEAE80] shrink-0">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-black text-stone-900 dark:text-white text-xs sm:text-sm line-clamp-1">
                              {exp.title}
                            </h4>
                            <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                              کد: {exp.code} • {toJalaliDate(exp.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10 transition-colors"
                            title="ویرایش هزینه"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(exp.id, exp.title)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="حذف و انتقال به سطل بازیافت"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Category Badge & Recurring */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${catInfo?.badgeColor || 'bg-stone-500/15 text-stone-400'}`}>
                          {exp.categoryLabel || catInfo?.label}
                        </span>
                        {exp.isRecurring && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-500 border border-blue-500/20">
                            هزینه تکرارشونده ماهانه
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {exp.costAllocation === 'shared_by_equity'
                            ? 'تسهیم ۵۰-۵۰ بین شرکا'
                            : exp.costAllocation === 'workshop_fund'
                            ? 'از صندوق تنخواه کارگاه'
                            : 'تامین اختصاصی'}
                        </span>
                      </div>

                      {/* Amount Box */}
                      <div className="mt-3 p-2.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 flex items-center justify-between">
                        <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">مبلغ هزینه:</span>
                        <span className="font-black text-rose-600 dark:text-rose-400 font-mono text-sm sm:text-base" dir="ltr">
                          {formatToman(exp.amount)}
                        </span>
                      </div>

                      {/* Metadata info */}
                      <div className="mt-2.5 space-y-1 text-[11px] text-stone-600 dark:text-stone-300">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">پرداخت‌شده توسط:</span>
                          <span className="font-bold text-stone-800 dark:text-stone-200">{exp.paidBy}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">روش پرداخت:</span>
                          <span className="font-medium">
                            {exp.paymentMethod === 'card'
                              ? 'کارت به کارت'
                              : exp.paymentMethod === 'bank_transfer'
                              ? 'پایا / ساتنا'
                              : exp.paymentMethod === 'cash'
                              ? 'نقدی از گاوصندوق'
                              : 'چک صیادی'}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="pt-1.5 text-[10px] text-stone-500 dark:text-stone-400 border-t border-stone-200 dark:border-white/5 line-clamp-2">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Receipt Attachment if present */}
                    {exp.receiptImageUrl && (
                      <div className="pt-2 border-t border-stone-200 dark:border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-emerald-500 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          رسید ضمیمه دارد
                        </span>
                        <a
                          href={exp.receiptImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#A67C38] dark:text-[#CEAE80] hover:underline font-bold"
                        >
                          مشاهده تصویر فاکتور
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: SETTLEMENT & WHO PAYS WHAT ("چه کسی چقدر باید بدهد؟") */}
      {/* ======================================================== */}
      {activeSubTab === 'settlement' && (
        <div className="space-y-6">
          <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4 border border-stone-200 dark:border-white/10">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="text-base sm:text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#A67C38] dark:text-[#CEAE80]" />
                  <span>تراز مخارج بهسازی، متریال و وضعیت بدهکار/بستانکار شرکا</span>
                </h3>
                <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 font-medium">
                  محاسبه دقیق اینکه هر شریک بابت بهسازی و خرید متریال کارگاه چقدر از جیب پرداخته، چقدر سهم تعهدی دارد و تراز نهایی تسویه با سود چگونه است
                </p>
              </div>

              <button
                onClick={() => {
                  const summaryText = `📊 صورت‌وضعیت تراز کارگاه پولاریس استایل (${toJalaliDate(new Date().toISOString())}):
- کل مخارج مشترک کارگاه: ${formatToman(settlementBalances.sharedExpenses)}
- سهم تعهدی هر شریک (۵۰٪): ${formatToman(settlementBalances.owner1.costObligation)}
---------------------------------
👤 ${settlementBalances.owner1.name}:
- پرداختی از جیب شخصی: ${formatToman(settlementBalances.owner1.paidOutOfPocket)}
- سهم سود دریافتی: ${formatToman(settlementBalances.owner1.profitShare)}
- تراز نهایی: ${formatToman(Math.abs(settlementBalances.owner1.netBalance))} (${settlementBalances.owner1.netBalance >= 0 ? 'بستانکار از کارگاه' : 'بدهکار به کارگاه'})

👤 ${settlementBalances.owner2.name}:
- پرداختی از جیب شخصی: ${formatToman(settlementBalances.owner2.paidOutOfPocket)}
- سهم سود دریافتی: ${formatToman(settlementBalances.owner2.profitShare)}
- تراز نهایی: ${formatToman(Math.abs(settlementBalances.owner2.netBalance))} (${settlementBalances.owner2.netBalance >= 0 ? 'بستانکار از کارگاه' : 'بدهکار به کارگاه'})`;

                  handleCopy(summaryText, 'all_settlement_summary');
                }}
                className="px-3.5 py-2 rounded-xl bg-[#CEAE80]/20 hover:bg-[#CEAE80]/30 text-[#A67C38] dark:text-[#CEAE80] border border-[#CEAE80]/40 text-xs font-black flex items-center gap-1.5"
              >
                {copiedKey === 'all_settlement_summary' ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedKey === 'all_settlement_summary' ? 'متن کپی شد!' : 'کپی خلاصه برای پیام‌رسان‌ها'}</span>
              </button>
            </div>

            {/* Explanation Guide Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-[#CEAE80]/15 border border-amber-600/20 dark:border-[#CEAE80]/30 flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-200">
              <AlertCircle className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">قاعده محاسبه تراز تسویه: </span>
                <span>
                  تراز نهایی = (سهم سود از فروش) + (مبالغی که شریک شخصاً بابت کارگاه خرج کرده) - (سهم ۵۰ درصدی او از کل مخارج مشترک). اگر مثبت باشد، شریک <strong>بستانکار</strong> بوده و از صندوق دریافت می‌کند؛ اگر منفی باشد، باید به صندوق کارگاه <strong>واریز</strong> نماید.
                </span>
              </div>
            </div>

            {/* Two Partner Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Partner 1: Mohammad */}
              <div className="p-4 sm:p-5 rounded-2xl glass-card border border-stone-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
                      {settlementBalances.owner1.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base">
                        {settlementBalances.owner1.name}
                      </h4>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        {settlementBalances.owner1.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    settlementBalances.owner1.netBalance >= 0
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {settlementBalances.owner1.netBalance >= 0 ? 'بستانکار از کارگاه' : 'بدهکار به کارگاه'}
                  </span>
                </div>

                {/* Calculation Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">مبالغ پرداخت‌شده از جیب شخصی:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                      + {formatToman(settlementBalances.owner1.paidOutOfPocket)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">سهم تعهدی از هزینه‌های کارگاه (۵۰٪):</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
                      - {formatToman(settlementBalances.owner1.costObligation)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">سهم سود استحقاقی از دوره قبل:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
                      + {formatToman(settlementBalances.owner1.profitShare)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#CEAE80]/15 border border-[#CEAE80]/30 text-sm font-black">
                    <span className="text-stone-800 dark:text-stone-200">تراز نهایی تسویه حساب:</span>
                    <span className="text-base font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                      {formatToman(Math.abs(settlementBalances.owner1.netBalance))}
                    </span>
                  </div>
                </div>

                {/* Bank Card Details */}
                <div
                  onClick={() => handleCopy(settlementBalances.owner1.bankCard, 'mohammad_card')}
                  className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-[#CEAE80] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">شماره کارت جهت واریز تسویه:</span>
                    <span className="text-[#A67C38] dark:text-[#CEAE80] font-bold text-[10px]">
                      {copiedKey === 'mohammad_card' ? 'کپی شد!' : 'کلیک برای کپی'}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-black text-stone-900 dark:text-white text-center tracking-wider" dir="ltr">
                    {settlementBalances.owner1.bankCard}
                  </div>
                </div>
              </div>

              {/* Partner 2: Amin */}
              <div className="p-4 sm:p-5 rounded-2xl glass-card border border-stone-200 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-black">
                      {settlementBalances.owner2.name.slice(0, 1)}
                    </div>
                    <div>
                      <h4 className="font-black text-stone-900 dark:text-white text-sm sm:text-base">
                        {settlementBalances.owner2.name}
                      </h4>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400">
                        {settlementBalances.owner2.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    settlementBalances.owner2.netBalance >= 0
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}>
                    {settlementBalances.owner2.netBalance >= 0 ? 'بستانکار از کارگاه' : 'بدهکار به کارگاه'}
                  </span>
                </div>

                {/* Calculation Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">مبالغ پرداخت‌شده از جیب شخصی:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                      + {formatToman(settlementBalances.owner2.paidOutOfPocket)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">سهم تعهدی از هزینه‌های کارگاه (۵۰٪):</span>
                    <span className="font-black text-rose-600 dark:text-rose-400 font-mono" dir="ltr">
                      - {formatToman(settlementBalances.owner2.costObligation)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-stone-100 dark:bg-black/30">
                    <span className="text-stone-500 dark:text-stone-400">سهم سود استحقاقی از دوره قبل:</span>
                    <span className="font-black text-blue-600 dark:text-blue-400 font-mono" dir="ltr">
                      + {formatToman(settlementBalances.owner2.profitShare)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#CEAE80]/15 border border-[#CEAE80]/30 text-sm font-black">
                    <span className="text-stone-800 dark:text-stone-200">تراز نهایی تسویه حساب:</span>
                    <span className="text-base font-mono text-emerald-600 dark:text-emerald-400" dir="ltr">
                      {formatToman(Math.abs(settlementBalances.owner2.netBalance))}
                    </span>
                  </div>
                </div>

                {/* Bank Card Details */}
                <div
                  onClick={() => handleCopy(settlementBalances.owner2.bankCard, 'amin_card')}
                  className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 cursor-pointer hover:border-[#CEAE80] transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-stone-500 dark:text-stone-400 font-medium">شماره کارت جهت واریز تسویه:</span>
                    <span className="text-[#A67C38] dark:text-[#CEAE80] font-bold text-[10px]">
                      {copiedKey === 'amin_card' ? 'کپی شد!' : 'کلیک برای کپی'}
                    </span>
                  </div>
                  <div className="font-mono text-xs font-black text-stone-900 dark:text-white text-center tracking-wider" dir="ltr">
                    {settlementBalances.owner2.bankCard}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 3: PROFIT DISTRIBUTIONS HISTORY & VOUCHERS */}
      {/* ======================================================== */}
      {activeSubTab === 'distribution' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-black text-stone-900 dark:text-white">
                دوره‌های تسویه و توزیع سود ثبت شده
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                مشاهده جزییات سهم‌بندی ۵ قسمتی، مبالغ واریزی به حساب پرسنل، سرمایه‌گذاران و صندوق ذخیره کارگاه
              </p>
            </div>

            <button
              onClick={() => setIsDistModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>محاسبه دوره جدید تسهیم</span>
            </button>
          </div>

          {profitDistributions.length === 0 ? (
            <div className="p-12 text-center glass-panel rounded-2xl border border-dashed border-stone-300 dark:border-white/10 text-stone-500">
              هنوز دوره تقسیم سودی ثبت نگردیده است. روی دکمه «محاسبه دوره جدید تسهیم» کلیک کنید.
            </div>
          ) : (
            <div className="space-y-4">
              {profitDistributions.map((dist) => (
                <div
                  key={dist.id}
                  className="glass-panel p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-white/10 shadow-lg space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-white/10">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base text-stone-900 dark:text-white">
                          {dist.periodName}
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                          {dist.distributionMode === 'units'
                            ? `مدل تسهیم ${toPersianDigits(dist.totalShareUnits || 5)} قسمتی`
                            : 'تسهیم درصدی'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono mt-0.5 block">
                        تاریخ محاسبه: {toJalaliDate(dist.calculatedAt)}
                      </span>
                    </div>

                    {/* Financial summary numbers */}
                    <div className="flex items-center gap-3 text-xs flex-wrap sm:flex-nowrap">
                      <div className="p-2 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5">
                        <span className="text-stone-500 text-[10px] block">درآمد ناخالص:</span>
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200" dir="ltr">
                          {formatToman(dist.grossRevenue)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5">
                        <span className="text-stone-500 text-[10px] block">کل هزینه‌ها:</span>
                        <span className="font-mono font-bold text-rose-500" dir="ltr">
                          {formatToman(dist.totalExpenses)}
                        </span>
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block font-bold">سود خالص تسهیم شده:</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                          {formatToman(dist.netProfit)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Recipients Breakdown Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dist.recipients.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-black text-xs text-stone-900 dark:text-white">
                              {rec.name}
                            </div>
                            <div className="text-[10px] text-stone-500 dark:text-stone-400">
                              {rec.role}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-[#CEAE80]/20 text-[#A67C38] dark:text-[#CEAE80] text-[10px] font-black">
                            {rec.shareUnits ? `${toPersianDigits(rec.shareUnits)} سهم (${toPersianDigits(rec.percentage)}٪)` : `${toPersianDigits(rec.percentage)}٪`}
                          </span>
                        </div>

                        <div className="p-2 rounded-lg bg-stone-200 dark:bg-black/50 flex items-center justify-between text-xs">
                          <span className="text-stone-600 dark:text-stone-400 font-medium">سهم دریافتی:</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                            {formatToman(rec.assignedAmount || 0)}
                          </span>
                        </div>

                        {rec.bankCard && (
                          <div
                            onClick={() => handleCopy(rec.bankCard!, `rec_card_${rec.id}`)}
                            className="text-[10px] text-stone-500 hover:text-stone-900 dark:hover:text-white flex items-center justify-between cursor-pointer font-mono pt-1 border-t border-stone-200 dark:border-white/5"
                          >
                            <span>کارت: {rec.bankCard}</span>
                            <span className="text-[#A67C38] dark:text-[#CEAE80] font-bold">
                              {copiedKey === `rec_card_${rec.id}` ? 'کپی شد' : 'کپی'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {dist.notes && (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 italic">
                      یادداشت: {dist.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 4: MACHINERY & WORKSHOP IMPROVEMENTS */}
      {/* ======================================================== */}
      {activeSubTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Action Box 1 */}
            <div className="glass-card p-5 rounded-2xl space-y-3 border border-amber-500/30">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-black">
                <Wrench className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900 dark:text-white">
                تعمیرات و سرویس چرخ‌های خیاطی
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                ثبت هزینه‌های روغن چرخ صنعتی، تعویض تیغ راسته و سردوز، تنظیم شاتون و سرویس موتورهای دینام
              </p>
              <button
                onClick={() => handleOpenNewExpense('machinery_maintenance')}
                className="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-black transition-all"
              >
                + ثبت سرویس چرخ خیاطی
              </button>
            </div>

            {/* Quick Action Box 2 */}
            <div className="glass-card p-5 rounded-2xl space-y-3 border border-purple-500/30">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center font-black">
                <Hammer className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900 dark:text-white">
                بهسازی، قفسه‌بندی و تجهیزات سالن
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                بهسازی نورپردازی سالن، ساخت رگال‌های صنعتی، نوسازی میز برش و استهلاک تجهیزات دوزندگی
              </p>
              <button
                onClick={() => handleOpenNewExpense('workshop_improvement')}
                className="w-full py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-700 dark:text-purple-300 text-xs font-black transition-all"
              >
                + ثبت هزینه بهسازی کارگاه
              </button>
            </div>

            {/* Quick Action Box 3 */}
            <div className="glass-card p-5 rounded-2xl space-y-3 border border-blue-500/30">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-black">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm text-stone-900 dark:text-white">
                تامین طاقه پارچه و ملزومات دوخت
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                خرید دوک نخ، زیپ، دکمه، لایی، خرج‌کار و تامین پارچه‌های کتان ترک و فوتر برای خطوط تولید
              </p>
              <button
                onClick={() => handleOpenNewExpense('materials_supplies')}
                className="w-full py-2 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-700 dark:text-blue-300 text-xs font-black transition-all"
              >
                + ثبت خرید متریال و خرج‌کار
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT EXPENSE FORM */}
      {/* ======================================================== */}
      {isExpenseModalOpen && (
        <Modal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          title={editingExpense ? 'ویرایش هزینه کارگاه' : 'ثبت هزینه و مخارج کارگاه'}
          subtitle="ثبت فاکتورهای بهسازی، متریال، سرویس چرخ، اجاره و قبوض با تعیین نحوه تسهیم بین شرکا"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveExpense} className="space-y-4 text-stone-900 dark:text-white">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                عنوان و شرح فاکتور / هزینه *
              </label>
              <input
                type="text"
                required
                placeholder="مثال: خرید قیچی برقی عمودی، سرویس چرخ راسته دوز، اجاره ماه مرداد..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm outline-none focus:border-[#CEAE80]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  دسته‌بندی هزینه *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as WorkshopExpense['category'];
                    setCategory(newCat);
                    const opt = categoryOptions.find((c) => c.id === newCat);
                    if (opt) setCategoryLabel(opt.label);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80] bg-stone-900 text-white"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  مبلغ هزینه (تومان) *
                </label>
                <input
                  type="number"
                  required
                  placeholder="مثال: ۱۵۰۰۰۰۰۰"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
                />
                {amount && Number(amount) > 0 && (
                  <div className="text-[10px] text-[#A67C38] dark:text-[#CEAE80] font-bold mt-1">
                    معادل: {numberToWordsPersian(Number(amount))} تومان
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  پرداخت‌کننده
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80] bg-stone-900 text-white"
                >
                  <option value="صندوق تنخواه کارگاه">صندوق تنخواه کارگاه</option>
                  {owners.map((o) => (
                    <option key={o.id} value={`${o.name} (هم‌بنیان‌گذار)`}>
                      {o.name} (از جیب شخصی)
                    </option>
                  ))}
                  <option value="سرمایه‌گذار خارج از کارگاه">سرمایه‌گذار خارج از کارگاه</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  نحوه تسهیم این هزینه
                </label>
                <select
                  value={costAllocation}
                  onChange={(e) => setCostAllocation(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80] bg-stone-900 text-white"
                >
                  <option value="shared_by_equity">تسهیم ۵۰-۵۰ بین شرکا (سهم‌الشرکه)</option>
                  <option value="workshop_fund">پرداخت از تنخواه مشترک کارگاه</option>
                  <option value="specific_payer">بر عهده شخص پرداخت‌کننده</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  تاریخ فاکتور
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono outline-none focus:border-[#CEAE80]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                توضیحات تکمیلی یا نام فروشنده / سرویس‌کار
              </label>
              <textarea
                rows={2}
                placeholder="مثال: خرید از سرای دوزندگان پلاک ۸۴، شامل ۵ ماه گارانتی قطعات..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80]"
              />
            </div>

            {/* Recurring toggle & receipt attachment */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 rounded text-[#CEAE80] focus:ring-[#CEAE80]"
                />
                <span>این هزینه به صورت ماهانه تکرار می‌شود (مانند اجاره یا قبوض)</span>
              </label>

              <label className="px-3 py-1.5 rounded-xl bg-stone-200 dark:bg-white/10 hover:bg-stone-300 dark:hover:bg-white/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors">
                <Camera className="w-3.5 h-3.5" />
                <span>{receiptImage ? 'تغییر تصویر فاکتور' : 'پیوست تصویر رسید / فاکتور'}</span>
                <input type="file" accept="image/*" onChange={handleReceiptUpload} className="hidden" />
              </label>
            </div>

            {receiptImage && (
              <div className="p-2 rounded-xl bg-black/30 flex items-center justify-between text-xs">
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تصویر فاکتور بارگذاری شد
                </span>
                <button
                  type="button"
                  onClick={() => setReceiptImage('')}
                  className="text-rose-400 hover:underline text-[10px]"
                >
                  حذف تصویر
                </button>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#CEAE80] hover:bg-[#B59363] text-black font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                {editingExpense ? 'ذخیره تغییرات' : 'ثبت هزینه در کارگاه'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADVANCED MULTI-PART PROFIT & COST SHARING ENGINE */}
      {/* ======================================================== */}
      {isDistModalOpen && (
        <Modal
          isOpen={isDistModalOpen}
          onClose={() => setIsDistModalOpen(false)}
          title="محاسبه و تقسیم سود و سهم‌بندی چند قسمتی کارگاه"
          subtitle="سهم‌بندی بر مبنای مدل ۵ قسمتی (یا دنگ دلخواه): ۲ سهم شرکا + ۳ سهم کارگران، صندوق بهسازی و سرمایه‌گذار"
          maxWidth="3xl"
        >
          <form onSubmit={handleSaveDistribution} className="space-y-4 text-stone-900 dark:text-white">
            {/* Quick Presets Bar */}
            <div className="p-3 rounded-xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/5 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-black text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#A67C38] dark:text-[#CEAE80]" />
                الگوهای آماده تسهیم:
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyPreset('5_parts')}
                  className="px-3 py-1 rounded-lg bg-[#CEAE80] text-black font-black text-xs shadow-sm hover:scale-105 transition-transform"
                >
                  مدل ۵ قسمتی (۲ شریک + ۳ کادر/صندوق/سرمایه‌گذار)
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('4_parts')}
                  className="px-3 py-1 rounded-lg bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-stone-200 font-bold text-xs hover:bg-stone-300"
                >
                  مدل ۴ قسمتی
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('50_50')}
                  className="px-3 py-1 rounded-lg bg-stone-200 dark:bg-white/10 text-stone-800 dark:text-stone-200 font-bold text-xs hover:bg-stone-300"
                >
                  مدل ۲ قسمتی (فقط ۲ شریک)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                عنوان دوره تسویه سود *
              </label>
              <input
                type="text"
                required
                value={periodTitle}
                onChange={(e) => setPeriodTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs sm:text-sm outline-none focus:border-[#CEAE80]"
              />
            </div>

            {/* Income & Expense Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  کل وصولی‌های نقدی (تومان)
                </label>
                <input
                  type="number"
                  value={grossRevenueInput}
                  onChange={(e) => setGrossRevenueInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  کل هزینه‌ها و مخارج کسر شده
                </label>
                <input
                  type="number"
                  value={totalExpensesInput}
                  onChange={(e) => setTotalExpensesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                  کسر ذخیره بهسازی و استهلاک
                </label>
                <input
                  type="number"
                  value={reinvestmentReserveInput}
                  onChange={(e) => setReinvestmentReserveInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs sm:text-sm font-mono outline-none focus:border-[#CEAE80]"
                />
              </div>
            </div>

            {/* Calculated Net Profit Highlight */}
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 block">
                  سود خالص قابل تسهیم بین ذی‌نفعان:
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                  پس از کسر هزینه‌ها و صندوق ذخیره بهسازی کارگاه
                </span>
              </div>
              <div className="text-base sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono" dir="ltr">
                {formatToman(netProfitCalculated)}
              </div>
            </div>

            {/* Dynamic Beneficiary List Builder */}
            <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-800 dark:text-stone-200">
                  فهرست ذی‌نفعان و تعداد سهم / دنگ (مجموع: {toPersianDigits(totalShareUnitsCount)} قسمت)
                </span>
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="px-3 py-1 rounded-lg bg-[#CEAE80]/20 hover:bg-[#CEAE80]/30 text-[#A67C38] dark:text-[#CEAE80] text-xs font-black flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>افزودن ذی‌نفع جدید</span>
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {computedRecipients.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl bg-stone-100 dark:bg-black/30 border border-stone-200 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 space-y-1 w-full sm:w-auto">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rec.name}
                          onChange={(e) => handleUpdateRecipient(rec.id, { name: e.target.value })}
                          className="px-2 py-1 rounded-lg glass-input text-xs font-black focus:border-[#CEAE80] w-48"
                        />
                        <span className="text-[10px] text-stone-400">({rec.role})</span>
                      </div>
                      <input
                        type="text"
                        placeholder="شماره کارت بانکی (اختیاری)"
                        value={rec.bankCard || ''}
                        onChange={(e) => handleUpdateRecipient(rec.id, { bankCard: e.target.value })}
                        className="px-2 py-0.5 rounded-md glass-input text-[11px] font-mono w-full sm:w-64"
                      />
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 text-[10px]">تعداد سهم:</span>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={rec.shareUnits}
                          onChange={(e) =>
                            handleUpdateRecipient(rec.id, { shareUnits: Number(e.target.value) || 1 })
                          }
                          className="w-14 px-2 py-1 rounded-lg glass-input text-xs text-center font-mono font-bold"
                        />
                      </div>

                      <div className="text-left">
                        <span className="text-[10px] text-[#A67C38] dark:text-[#CEAE80] font-bold block">
                          {toPersianDigits(rec.percentage)}٪
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-xs" dir="ltr">
                          {formatToman(rec.assignedAmount || 0)}
                        </span>
                      </div>

                      {computedRecipients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveRecipient(rec.id)}
                          className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                یادداشت و صورت‌جلسه تقسیم سود
              </label>
              <input
                type="text"
                placeholder="مثال: تسویه با کسر ۱۵ میلیون تومان ذخیره خرید طاقه فوتر برای فصل زمستان..."
                value={distributionNotes}
                onChange={(e) => setDistributionNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl glass-input text-xs outline-none focus:border-[#CEAE80]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setIsDistModalOpen(false)}
                className="px-4 py-2 rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-white text-xs font-bold"
              >
                انصراف
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                تایید و ثبت رسمی تقسیم سود دوره
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
