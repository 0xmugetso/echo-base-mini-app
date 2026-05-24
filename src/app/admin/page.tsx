'use client';

import { useState, useEffect } from 'react';

type TaskCondition = {
    logicalOperator: 'IF' | 'AND' | 'OR';
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'true' | 'false' | 'contains';
    value: string;
};

type TimeSpan = {
    type: 'infinite' | 'custom';
    deadline?: string | null;
};

type Task = {
    _id?: string;
    title: string;
    description: string;
    actionLink: string;
    buttonType: 'switch' | 'button' | 'input';
    weight: number;
    points: number;
    timeSpan: TimeSpan;
    conditions: TaskCondition[];
    isActive: boolean;
    relativePriority?: number;
    actionType: 'claim' | 'follow' | 'engage' | 'raid';
    actionTarget: string;
    actionSubtype?: 'like' | 'recast' | 'comment' | '';
};

const FIELDS_LIST = [
    // User Stats
    { label: 'User Stats: Total Transactions', value: 'userStats.stats.total_tx' },
    { label: 'User Stats: Total Volume USD', value: 'userStats.stats.total_volume_usd' },
    { label: 'User Stats: Wallet Age Days', value: 'userStats.stats.wallet_age_days' },
    { label: 'User Stats: Biggest Single Tx USD', value: 'userStats.stats.biggest_single_tx' },
    { label: 'User Stats: Farcaster Wallet Value USD', value: 'userStats.stats.farcaster.wallet_value_usd' },
    { label: 'User Stats: Farcaster Cast Count', value: 'userStats.stats.farcaster.cast_count' },
    { label: 'User Stats: Holds DEGEN (Boolean)', value: 'userStats.stats.farcaster.holdings.degen' },
    { label: 'User Stats: Holds CLANKER (Boolean)', value: 'userStats.stats.farcaster.holdings.clanker' },
    { label: 'User Stats: Holds TOSHI (Boolean)', value: 'userStats.stats.farcaster.holdings.toshi' },
    { label: 'User Stats: Holds PRO OG (Boolean)', value: 'userStats.stats.farcaster.holdings.pro_og' },
    { label: 'User Stats: Holds BASED PUNK (Boolean)', value: 'userStats.stats.farcaster.holdings.based_punk' },
    
    // Echo Profile
    { label: 'Echo Profile: Points Earned', value: 'profile.points' },
    { label: 'Echo Profile: Onchain Rep Score', value: 'profile.onchainScore' },
    { label: 'Echo Profile: Current Streak Days', value: 'profile.streak.current' },
    { label: 'Echo Profile: Highest Streak Days', value: 'profile.streak.highest' },
    { label: 'Echo Profile: Referral Count', value: 'profile.referralStats.count' },
    { label: 'Echo Profile: Referral Earnings', value: 'profile.referralStats.earnings' },
];

const OPERATORS_LIST = [
    { label: 'Equals (==)', value: 'equals' },
    { label: 'Not Equals (!=)', value: 'not_equals' },
    { label: 'Greater Than (>)', value: 'greater_than' },
    { label: 'Less Than (<)', value: 'less_than' },
    { label: 'Greater Than or Equal (>=)', value: 'greater_than_or_equal' },
    { label: 'Less Than or Equal (<=)', value: 'less_than_or_equal' },
    { label: 'Is True', value: 'true' },
    { label: 'Is False', value: 'false' },
    { label: 'Contains Text', value: 'contains' },
];

// --- PREMIUM CUSTOM RETRO DATETIME PICKER COMPONENT ---
function RetroDatetimePicker({ value, onChange }: { value: string; onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    
    // Parse current value or default to now
    const initialDate = value ? new Date(value) : new Date();
    
    const [viewYear, setViewYear] = useState(initialDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11
    
    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [selHour, setSelHour] = useState(initialDate.getHours());
    
    // Default selected minutes to nearest 15 step
    const getNearest15 = (m: number) => {
        if (m < 8) return 0;
        if (m < 23) return 15;
        if (m < 38) return 30;
        if (m < 53) return 45;
        return 0;
    };
    const [selMinute, setSelMinute] = useState(getNearest15(initialDate.getMinutes()));

    const monthNames = [
        "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
        "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
    ];

    // Calendar Calculations
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday, 6 = Saturday

    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    const handleDayClick = (dayNum: number) => {
        const d = new Date(viewYear, viewMonth, dayNum);
        d.setHours(selHour);
        d.setMinutes(selMinute);
        d.setSeconds(0);
        d.setMilliseconds(0);
        setSelectedDate(d);
    };

    const handleTodayClick = () => {
        const today = new Date();
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
        setSelectedDate(today);
        setSelHour(today.getHours());
        setSelMinute(getNearest15(today.getMinutes()));
    };

    const handleConfirm = () => {
        const finalDate = new Date(selectedDate);
        finalDate.setHours(selHour);
        finalDate.setMinutes(selMinute);
        onChange(finalDate.toISOString());
        setIsOpen(false);
    };

    const formattedDisplay = value 
        ? new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        : 'NO DEADLINE SELECTED';

    // Date comparison boundaries (Block past dates)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="relative font-mono">
            {/* The trigger button */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 text-left border border-white/30 bg-black px-3 py-2 text-xs text-white hover:border-primary transition-all flex justify-between items-center cursor-pointer font-bold"
                >
                    <span>{formattedDisplay}</span>
                    <span className="text-primary text-[10px] uppercase font-bold">[ SELECT ]</span>
                </button>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="border border-red-500/50 hover:bg-red-500 hover:text-black text-red-500 px-3 py-2 text-[10px] uppercase font-bold transition-all"
                    >
                        CLEAR
                    </button>
                )}
            </div>

            {/* Calendar Popover */}
            {isOpen && (
                <div className="absolute z-50 top-10 left-0 right-0 border-2 border-primary bg-black p-4 shadow-[4px_4px_0_0_theme('colors.primary')] w-full max-w-sm mt-1">
                    <div className="flex justify-between items-center border-b border-primary/20 pb-2 mb-3">
                        <span className="text-[10px] font-bold text-primary uppercase">DATETIME_PICKER_v1.1</span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleTodayClick}
                                className="text-primary hover:text-white text-[9px] uppercase border border-primary/30 px-1 font-bold bg-primary/5"
                            >
                                TODAY
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="text-red-500 hover:text-white text-[10px] uppercase font-bold"
                            >
                                [ X ]
                            </button>
                        </div>
                    </div>

                    {/* Month / Year controls */}
                    <div className="flex justify-between items-center text-xs mb-3 font-bold">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="border border-white/20 hover:bg-primary hover:text-black px-2 py-0.5 text-center font-bold"
                        >
                            &lt;
                        </button>
                        <span className="text-shadow-glow text-white">
                            {monthNames[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="border border-white/20 hover:bg-primary hover:text-black px-2 py-0.5 text-center font-bold"
                        >
                            &gt;
                        </button>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-1 text-[8px] font-bold uppercase text-gray-500 text-center mb-1">
                        <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] mb-4">
                        {/* Padded Empty Spaces */}
                        {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                            <div key={`empty-${idx}`} className="h-6 w-full opacity-0"></div>
                        ))}

                        {/* Actual Month Days */}
                        {Array.from({ length: daysInMonth }).map((_, idx) => {
                            const dayNum = idx + 1;
                            
                            // Check selected state
                            const isSelected = selectedDate.getDate() === dayNum && 
                                               selectedDate.getMonth() === viewMonth && 
                                               selectedDate.getFullYear() === viewYear;
                            
                            // Check today state
                            const nowObj = new Date();
                            const isToday = nowObj.getDate() === dayNum &&
                                            nowObj.getMonth() === viewMonth &&
                                            nowObj.getFullYear() === viewYear;

                            // Check past date boundary (block past dates)
                            const dateToCompare = new Date(viewYear, viewMonth, dayNum);
                            dateToCompare.setHours(0, 0, 0, 0);
                            const isPast = dateToCompare < today;

                            return (
                                <button
                                    key={`day-${dayNum}`}
                                    type="button"
                                    disabled={isPast}
                                    onClick={() => handleDayClick(dayNum)}
                                    className={`h-6 w-full flex items-center justify-center border font-bold transition-all ${
                                        isPast 
                                            ? 'border-transparent text-gray-800 opacity-20 cursor-not-allowed bg-transparent'
                                            : isSelected 
                                            ? 'bg-primary border-primary text-black'
                                            : isToday
                                            ? 'border-dashed border-primary text-primary bg-primary/10 shadow-[0_0_4px_theme(\'colors.primary\')]'
                                            : 'border-white/5 bg-white/5 hover:border-primary text-white hover:bg-primary/10'
                                    }`}
                                >
                                    {dayNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Time Selectors */}
                    <div className="border-t border-white/10 pt-3 space-y-3">
                        <span className="block text-[8px] text-gray-500 font-bold uppercase">TIME CONFIGURATION (24h)</span>
                        <div className="flex gap-4 items-center text-xs">
                            <div className="flex-1">
                                <label className="block text-[8px] text-gray-400 uppercase font-bold mb-1">Hour</label>
                                <select
                                    value={selHour}
                                    onChange={(e) => {
                                        const h = parseInt(e.target.value);
                                        setSelHour(h);
                                        const updated = new Date(selectedDate);
                                        updated.setHours(h);
                                        setSelectedDate(updated);
                                    }}
                                    className="block w-full border border-white/20 bg-black text-white px-2 py-1 rounded-none text-xs focus:border-primary focus:outline-none"
                                >
                                    {Array.from({ length: 24 }).map((_, idx) => (
                                        <option key={idx} value={idx}>{idx < 10 ? `0${idx}` : idx}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1">
                                <label className="block text-[8px] text-gray-400 uppercase font-bold mb-1">Minute (15m step)</label>
                                <select
                                    value={selMinute}
                                    onChange={(e) => {
                                        const m = parseInt(e.target.value);
                                        setSelMinute(m);
                                        const updated = new Date(selectedDate);
                                        updated.setMinutes(m);
                                        setSelectedDate(updated);
                                    }}
                                    className="block w-full border border-white/20 bg-black text-white px-2 py-1 rounded-none text-xs focus:border-primary focus:outline-none"
                                >
                                    <option value={0}>00</option>
                                    <option value={15}>15</option>
                                    <option value={30}>30</option>
                                    <option value={45}>45</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-1 py-1.5 bg-primary text-black font-bold uppercase tracking-wider hover:bg-white text-center transition-all shadow-[2px_2px_0_0_#fff]"
                        >
                            CONFIRM
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-1.5 border border-white text-white font-bold uppercase tracking-wider hover:bg-white hover:text-black text-center transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AdminPage() {
    const [authenticated, setAuthenticated] = useState<boolean | null>(null);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Tab switcher state
    const [adminTab, setAdminTab] = useState<'tasks' | 'users'>('tasks');

    // Tasks states
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [dashboardError, setDashboardError] = useState('');
    const [totalActiveWeight, setTotalActiveWeight] = useState(0);

    // Users states
    const [users, setUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [usersError, setUsersError] = useState('');

    // Users Search, Filter, Sort states
    const [userSearch, setUserSearch] = useState('');
    const [userSort, setUserSort] = useState<'points' | 'streak' | 'onchain' | 'joined'>('points');
    const [userFilterActiveStreak, setUserFilterActiveStreak] = useState(false);
    const [userFilterHasReferrals, setUserFilterHasReferrals] = useState(false);
    const [userFilterHasNFT, setUserFilterHasNFT] = useState(false);

    // Task Form states
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formActionLink, setFormActionLink] = useState('');
    const [formButtonType, setFormButtonType] = useState<'switch' | 'button' | 'input'>('button');
    const [formWeight, setFormWeight] = useState<number>(10);
    const [formPoints, setFormPoints] = useState<number>(20);
    const [formTimeSpanType, setFormTimeSpanType] = useState<'infinite' | 'custom'>('infinite');
    const [formDeadline, setFormDeadline] = useState('');
    const [formConditions, setFormConditions] = useState<TaskCondition[]>([]);
    const [formIsActive, setFormIsActive] = useState<boolean>(true);
    // Extended Form Actions states
    const [formActionType, setFormActionType] = useState<'claim' | 'follow' | 'engage' | 'raid'>('claim');
    const [formActionTarget, setFormActionTarget] = useState('');
    const [formActionSubtype, setFormActionSubtype] = useState<'like' | 'recast' | 'comment' | ''>('');

    const [submitLoading, setSubmitLoading] = useState(false);

    // Dynamic Live Weight Priority calculation before saving
    const [livePriority, setLivePriority] = useState<number>(0);

    useEffect(() => {
        checkSession();
    }, []);

    useEffect(() => {
        calculateLivePriority();
    }, [formWeight, formIsActive, tasks, editingTaskId]);

    const checkSession = async () => {
        try {
            const res = await fetch('/api/admin/login');
            if (res.ok) {
                setAuthenticated(true);
                fetchTasks();
                fetchUsers();
            } else {
                setAuthenticated(false);
            }
        } catch (e) {
            setAuthenticated(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAuthenticated(true);
                fetchTasks();
                fetchUsers();
            } else {
                setLoginError(data.error || 'Login failed');
            }
        } catch (e) {
            setLoginError('Server authentication error');
        }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/login', { method: 'DELETE' });
            setAuthenticated(false);
            setTasks([]);
            setUsers([]);
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const fetchTasks = async () => {
        setLoadingTasks(true);
        setDashboardError('');
        try {
            const res = await fetch('/api/admin/tasks');
            const data = await res.json();
            if (res.ok && data.success) {
                setTasks(data.tasks);
                setTotalActiveWeight(data.totalActiveWeight);
            } else {
                setDashboardError(data.error || 'Failed to fetch tasks');
            }
        } catch (e) {
            setDashboardError('Network error loading tasks');
        } finally {
            setLoadingTasks(false);
        }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        setUsersError('');
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (res.ok && data.success) {
                setUsers(data.users);
            } else {
                setUsersError(data.error || 'Failed to fetch users');
            }
        } catch (e) {
            setUsersError('Network error loading users');
        } finally {
            setLoadingUsers(false);
        }
    };

    const calculateLivePriority = () => {
        if (!formIsActive) {
            setLivePriority(0);
            return;
        }

        const activeTasks = tasks.filter(t => t.isActive && t._id !== editingTaskId);
        const activeWeightSum = activeTasks.reduce((sum, t) => sum + (t.weight || 0), 0) + Number(formWeight);

        if (activeWeightSum > 0) {
            const percent = (Number(formWeight) / activeWeightSum) * 100;
            setLivePriority(parseFloat(percent.toFixed(2)));
        } else {
            setLivePriority(0);
        }
    };

    const handleAddCondition = () => {
        const newOperator: 'IF' | 'AND' | 'OR' = formConditions.length === 0 ? 'IF' : 'AND';
        setFormConditions([
            ...formConditions,
            {
                logicalOperator: newOperator,
                field: FIELDS_LIST[0].value,
                operator: 'equals',
                value: ''
            }
        ]);
    };

    const handleRemoveCondition = (index: number) => {
        const updated = formConditions.filter((_, i) => i !== index);
        if (updated.length > 0) {
            updated[0].logicalOperator = 'IF';
        }
        setFormConditions(updated);
    };

    const handleConditionChange = (index: number, key: keyof TaskCondition, val: string) => {
        const updated = [...formConditions];
        updated[index] = { ...updated[index], [key]: val } as TaskCondition;
        setFormConditions(updated);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitLoading(true);

        const taskData = {
            title: formTitle,
            description: formDescription,
            actionLink: formActionLink,
            buttonType: formButtonType,
            weight: Number(formWeight),
            points: Number(formPoints),
            timeSpan: {
                type: formTimeSpanType,
                deadline: formTimeSpanType === 'custom' && formDeadline ? formDeadline : null
            },
            conditions: formConditions,
            isActive: formIsActive,
            actionType: formActionType,
            actionTarget: formActionTarget,
            actionSubtype: formActionSubtype
        };

        try {
            const url = editingTaskId ? `/api/admin/tasks/${editingTaskId}` : '/api/admin/tasks';
            const method = editingTaskId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskData)
            });

            if (res.ok) {
                resetForm();
                fetchTasks();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to save task');
            }
        } catch (e) {
            alert('Error connecting to backend API');
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleEditClick = (task: Task) => {
        setEditingTaskId(task._id || null);
        setFormTitle(task.title);
        setFormDescription(task.description);
        setFormActionLink(task.actionLink || '');
        setFormButtonType(task.buttonType || 'button');
        setFormWeight(task.weight);
        setFormPoints(task.points);
        setFormTimeSpanType(task.timeSpan.type);
        setFormDeadline(task.timeSpan.deadline ? new Date(task.timeSpan.deadline).toISOString() : '');
        setFormConditions(task.conditions || []);
        setFormIsActive(task.isActive);
        setFormActionType(task.actionType || 'claim');
        setFormActionTarget(task.actionTarget || '');
        setFormActionSubtype(task.actionSubtype || '');
    };

    const handleDeleteClick = async (id: string) => {
        if (!confirm('Are you sure you want to permanently delete this task?')) return;

        try {
            const res = await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (editingTaskId === id) resetForm();
                fetchTasks();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete task');
            }
        } catch (e) {
            alert('Error deleting task');
        }
    };

    const handleToggleActiveClick = async (task: Task) => {
        try {
            const res = await fetch(`/api/admin/tasks/${task._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...task,
                    isActive: !task.isActive
                })
            });
            if (res.ok) {
                fetchTasks();
            }
        } catch (e) {
            console.error('Error toggling active status', e);
        }
    };

    const resetForm = () => {
        setEditingTaskId(null);
        setFormTitle('');
        setFormDescription('');
        setFormActionLink('');
        setFormButtonType('button');
        setFormWeight(10);
        setFormPoints(20);
        setFormTimeSpanType('infinite');
        setFormDeadline('');
        setFormConditions([]);
        setFormIsActive(true);
        setFormActionType('claim');
        setFormActionTarget('');
        setFormActionSubtype('');
    };

    // Filter and Sort logic for Registered Users list
    const getFilteredAndSortedUsers = () => {
        let list = [...users];

        // 1. Search Query (Username, Address, FID)
        if (userSearch.trim()) {
            const query = userSearch.toLowerCase();
            list = list.filter(u => 
                (u.username?.toLowerCase() || '').includes(query) ||
                (u.address?.toLowerCase() || '').includes(query) ||
                String(u.fid).includes(query)
            );
        }

        // 2. Filters
        if (userFilterActiveStreak) {
            list = list.filter(u => (u.streak?.current || 0) > 0);
        }
        if (userFilterHasReferrals) {
            list = list.filter(u => (u.referralStats?.count || 0) > 0);
        }
        if (userFilterHasNFT) {
            list = list.filter(u => u.nftTokenId !== null && u.nftTokenId !== undefined);
        }

        // 3. Sorting
        list.sort((a, b) => {
            if (userSort === 'points') {
                return (b.points || 0) - (a.points || 0);
            }
            if (userSort === 'streak') {
                return (b.streak?.current || 0) - (a.streak?.current || 0);
            }
            if (userSort === 'onchain') {
                return (b.onchainScore || 0) - (a.onchainScore || 0);
            }
            if (userSort === 'joined') {
                return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
            }
            return 0;
        });

        return list;
    };

    if (authenticated === null) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
                <div className="spinner-primary"></div>
            </div>
        );
    }

    // --- LOGIN RENDER ---
    if (!authenticated) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 select-none relative font-mono">
                <div className="w-full max-w-md border-2 border-primary p-6 bg-black relative shadow-[8px_8px_0_0_theme('colors.primary')]">
                    <div className="absolute top-0 right-0 bg-primary text-black font-bold text-xs px-2 py-0.5 uppercase tracking-wide">
                        SECURE CONSOLE
                    </div>

                    <div className="text-center mb-6">
                        <h1 className="text-2xl font-bold tracking-widest text-shadow-glow text-white">ECHO // CORE</h1>
                        <p className="text-xs text-primary mt-1 uppercase">AUTHENTICATION REQUIRED</p>
                    </div>

                    {loginError && (
                        <div className="border border-red-600 bg-red-950/20 text-red-500 p-2 text-xs text-center uppercase mb-4">
                            ERROR: {loginError}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">USERNAME</label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="block w-full border-2 border-white bg-black px-3 py-2 text-white placeholder-gray-800 focus:border-primary focus:outline-none rounded-none text-sm"
                                placeholder="CONSOLE USERNAME"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">PASSWORD</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="block w-full border-2 border-white bg-black px-3 py-2 text-white placeholder-gray-800 focus:border-primary focus:outline-none rounded-none text-sm"
                                placeholder="••••••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-primary text-black font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black shadow-[4px_4px_0_0_#fff] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                        >
                            INITIALIZE CONSOLE
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- DASHBOARD RENDER ---
    return (
        <div className="min-h-screen bg-black text-white p-6 font-mono selection:bg-primary selection:text-white pb-20">
            {/* Top Header */}
            <div className="border-b-2 border-primary pb-4 mb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold tracking-widest text-shadow-glow flex items-center gap-2">
                        <span className="text-primary">■</span> ECHO CORE // MISSION CONTROL
                    </h1>
                    <p className="text-[10px] text-gray-500 uppercase mt-0.5">DYNAMIC DATABASE MANAGEMENT CONSOLE</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-[10px] text-[#00ff00] border border-[#00ff00]/40 px-2 py-0.5 uppercase">
                        SESSION ACTIVE
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-xs text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-black px-2 py-1 transition-all"
                    >
                        SHUTDOWN
                    </button>
                </div>
            </div>

            {/* NEW: TOP TAB NAVIGATION BAR */}
            <div className="flex gap-2 mb-6 border-b border-white/10 pb-4 select-none">
                <button
                    onClick={() => setAdminTab('tasks')}
                    className={`px-4 py-2 font-bold text-xs uppercase border-2 transition-all cursor-pointer ${
                        adminTab === 'tasks'
                            ? 'border-primary bg-primary text-black shadow-[2px_2px_0_0_#fff]'
                            : 'border-white/20 text-gray-400 hover:border-white hover:text-white'
                    }`}
                >
                    [ TASKS_DATABASE ]
                </button>
                <button
                    onClick={() => setAdminTab('users')}
                    className={`px-4 py-2 font-bold text-xs uppercase border-2 transition-all cursor-pointer ${
                        adminTab === 'users'
                            ? 'border-primary bg-primary text-black shadow-[2px_2px_0_0_#fff]'
                            : 'border-white/20 text-gray-400 hover:border-white hover:text-white'
                    }`}
                >
                    [ REGISTERED_USERS ]
                </button>
            </div>

            {/* --- 1. TASKS TAB VIEW --- */}
            {adminTab === 'tasks' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT SIDE: CREATE/EDIT PANEL */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="border-2 border-primary bg-black p-4 relative shadow-[4px_4px_0_0_theme('colors.primary')]">
                            <div className="flex justify-between items-center border-b border-primary/30 pb-2 mb-4">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                                    {editingTaskId ? 'MODIFY_MISSION' : 'CREATE_NEW_MISSION'}
                                </h2>
                                {editingTaskId && (
                                    <button
                                        onClick={resetForm}
                                        className="text-[10px] text-gray-500 hover:text-white uppercase border border-gray-800 px-1"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={e => setFormTitle(e.target.value)}
                                        className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs"
                                        placeholder="e.g. Follow Mugetso"
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Description</label>
                                    <textarea
                                        value={formDescription}
                                        onChange={e => setFormDescription(e.target.value)}
                                        rows={2}
                                        className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs resize-none"
                                        placeholder="Describe mission steps..."
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Points */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Points Reward</label>
                                        <input
                                            type="number"
                                            value={formPoints}
                                            onChange={e => setFormPoints(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white focus:border-primary focus:outline-none rounded-none text-xs"
                                            min={0}
                                            required
                                        />
                                    </div>

                                    {/* Weight */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Priority Weight</label>
                                        <input
                                            type="number"
                                            value={formWeight}
                                            onChange={e => setFormWeight(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white focus:border-primary focus:outline-none rounded-none text-xs"
                                            min={0}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Dynamic weight priority display */}
                                <div className="bg-primary/5 border border-primary/20 p-2 flex justify-between items-center text-[10px] uppercase">
                                    <span className="text-gray-500 font-bold">Estimated Relative Priority:</span>
                                    <span className="text-primary font-bold text-shadow-glow">
                                        {livePriority}% of Active Pool
                                    </span>
                                </div>

                                {/* Action Type Selector */}
                                <div className="border border-primary/20 p-3 space-y-3 bg-primary/5">
                                    <div>
                                        <label className="block text-[10px] text-primary uppercase font-bold mb-1">Farcaster Verification Quest Type</label>
                                        <select
                                            value={formActionType}
                                            onChange={e => {
                                                const type = e.target.value as any;
                                                setFormActionType(type);
                                                setFormActionTarget('');
                                                setFormActionSubtype('');
                                            }}
                                            className="block w-full border border-primary/40 bg-black px-3 py-1.5 text-primary focus:border-primary focus:outline-none rounded-none text-xs font-bold"
                                        >
                                            <option value="claim">Claim Button (Immediate reward)</option>
                                            <option value="follow">Follow Mission (Follow User Farcaster verification)</option>
                                            <option value="engage">Engagement Task (Like/Recast/Comment on Cast)</option>
                                            <option value="raid">Raid Mission (Casting Specific Template message)</option>
                                        </select>
                                    </div>

                                    {/* Action Type Custom Options */}
                                    {formActionType === 'follow' && (
                                        <div>
                                            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Target Farcaster Username</label>
                                            <input
                                                type="text"
                                                value={formActionTarget}
                                                onChange={e => setFormActionTarget(e.target.value.replace('@', ''))}
                                                className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs"
                                                placeholder="e.g. mugetso (No '@' symbol)"
                                                required
                                            />
                                        </div>
                                    )}

                                    {formActionType === 'engage' && (
                                        <div className="space-y-2">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Warpcast Cast URL</label>
                                                <input
                                                    type="url"
                                                    value={formActionTarget}
                                                    onChange={e => setFormActionTarget(e.target.value)}
                                                    className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs"
                                                    placeholder="https://warpcast.com/khash/0x123abc"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Engagement Type Required</label>
                                                <select
                                                    value={formActionSubtype}
                                                    onChange={e => setFormActionSubtype(e.target.value as any)}
                                                    className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white focus:border-primary focus:outline-none rounded-none text-xs"
                                                    required
                                                >
                                                    <option value="like">Like Cast</option>
                                                    <option value="recast">Recast Cast</option>
                                                    <option value="comment">Comment / Reply on Cast</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {formActionType === 'raid' && (
                                        <div>
                                            <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Raid Message Template Required</label>
                                            <textarea
                                                value={formActionTarget}
                                                onChange={e => setFormActionTarget(e.target.value)}
                                                rows={2}
                                                className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs resize-none"
                                                placeholder="User must cast this exact text or keyword to unlock..."
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* Button Type - Fallback visual styles */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">UI Style</label>
                                        <select
                                            value={formButtonType}
                                            onChange={e => setFormButtonType(e.target.value as any)}
                                            className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white focus:border-primary focus:outline-none rounded-none text-xs"
                                        >
                                            <option value="button">Claim Button</option>
                                            <option value="switch">Active Switch</option>
                                            <option value="input">Verification Input</option>
                                        </select>
                                    </div>

                                    {/* Status */}
                                    <div>
                                        <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Status</label>
                                        <select
                                            value={formIsActive ? 'active' : 'inactive'}
                                            onChange={e => setFormIsActive(e.target.value === 'active')}
                                            className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white focus:border-primary focus:outline-none rounded-none text-xs"
                                        >
                                            <option value="active">Active (Deploy)</option>
                                            <option value="inactive">Inactive (Draft)</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Action Link */}
                                <div>
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Quest Redirection URL / Fallback Link</label>
                                    <input
                                        type="text"
                                        value={formActionLink}
                                        onChange={e => setFormActionLink(e.target.value)}
                                        className="block w-full border border-white/30 bg-black px-3 py-1.5 text-white placeholder-gray-700 focus:border-primary focus:outline-none rounded-none text-xs"
                                        placeholder="Fallback redirect URL (optional for simple claim)"
                                    />
                                </div>

                                {/* Time Span */}
                                <div className="border border-white/10 p-3 space-y-2">
                                    <label className="block text-[10px] text-gray-400 uppercase font-bold">DEADLINE / TIME SPAN</label>
                                    <div className="flex gap-4 text-xs">
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={formTimeSpanType === 'infinite'}
                                                onChange={() => setFormTimeSpanType('infinite')}
                                                className="accent-primary"
                                            />
                                            Infinite Duration
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={formTimeSpanType === 'custom'}
                                                onChange={() => setFormTimeSpanType('custom')}
                                                className="accent-primary"
                                            />
                                            Custom Deadline
                                        </label>
                                    </div>

                                    {formTimeSpanType === 'custom' && (
                                        <div className="mt-2 space-y-1">
                                            <label className="block text-[9px] text-gray-500 uppercase font-bold">Select Date & Time</label>
                                            <RetroDatetimePicker
                                                value={formDeadline}
                                                onChange={(val) => setFormDeadline(val)}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* STEPABLE CONDITION BUILDER */}
                                <div className="border border-white/10 p-3 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-[10px] text-gray-400 uppercase font-bold">Eligibility Conditions</label>
                                        <button
                                            type="button"
                                            onClick={handleAddCondition}
                                            className="text-[9px] text-primary border border-primary px-1.5 py-0.5 hover:bg-primary hover:text-black transition-all"
                                        >
                                            + ADD CONDITION
                                        </button>
                                    </div>

                                    {formConditions.length === 0 ? (
                                        <p className="text-[10px] text-gray-600 uppercase italic text-center py-2">
                                            No conditions. Open to everyone.
                                        </p>
                                    ) : (
                                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                                            {formConditions.map((cond, index) => (
                                                <div key={index} className="border border-white/10 p-2 relative space-y-2 bg-white/5">
                                                    {/* Delete Step */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveCondition(index)}
                                                        className="absolute top-1 right-1 text-red-500 hover:text-white text-[9px]"
                                                    >
                                                        [X]
                                                    </button>

                                                    {/* Logical Operator */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase">Step {index + 1}:</span>
                                                        {index === 0 ? (
                                                            <span className="text-[9px] text-primary font-bold bg-primary/10 px-1">IF</span>
                                                        ) : (
                                                            <select
                                                                value={cond.logicalOperator}
                                                                onChange={e => handleConditionChange(index, 'logicalOperator', e.target.value as any)}
                                                                className="border border-white/20 bg-black text-[9px] text-white px-1 py-0.5 rounded-none font-bold"
                                                            >
                                                                <option value="AND">AND</option>
                                                                <option value="OR">OR</option>
                                                            </select>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-2">
                                                        {/* Field Select */}
                                                        <div>
                                                            <label className="block text-[8px] text-gray-500 uppercase font-bold mb-0.5">Database Field</label>
                                                            <select
                                                                value={cond.field}
                                                                onChange={e => handleConditionChange(index, 'field', e.target.value)}
                                                                className="block w-full border border-white/20 bg-black text-[9px] text-white p-1 rounded-none"
                                                            >
                                                                {FIELDS_LIST.map(f => (
                                                                    <option key={f.value} value={f.value}>{f.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        {/* Operator Select */}
                                                        <div>
                                                            <label className="block text-[8px] text-gray-500 uppercase font-bold mb-0.5">Comparison</label>
                                                            <select
                                                                value={cond.operator}
                                                                onChange={e => handleConditionChange(index, 'operator', e.target.value as any)}
                                                                className="block w-full border border-white/20 bg-black text-[9px] text-white p-1 rounded-none"
                                                            >
                                                                {OPERATORS_LIST.map(o => (
                                                                    <option key={o.value} value={o.value}>{o.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>

                                                    {/* Target Value Input */}
                                                    {!['true', 'false'].includes(cond.operator) && (
                                                        <div>
                                                            <label className="block text-[8px] text-gray-500 uppercase font-bold mb-0.5">Target Value</label>
                                                            <input
                                                                type="text"
                                                                value={cond.value}
                                                                onChange={e => handleConditionChange(index, 'value', e.target.value)}
                                                                className="block w-full border border-white/20 bg-black text-[9px] text-white p-1 rounded-none font-mono"
                                                                placeholder="Comparison value..."
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={submitLoading}
                                    className="w-full py-2 bg-primary text-black font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black shadow-[4px_4px_0_0_#fff] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                                >
                                    {submitLoading ? 'SAVING...' : (editingTaskId ? 'UPDATE_MISSION' : 'CREATE_MISSION')}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT SIDE: LIST PANEL */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Stats Dashboard Box */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="border border-white/10 bg-white/5 p-3 text-center uppercase">
                                <p className="text-[8px] text-gray-500 font-bold mb-0.5">Total Tasks</p>
                                <p className="text-xl font-bold text-white">{tasks.length}</p>
                            </div>
                            <div className="border border-primary bg-primary/5 p-3 text-center uppercase">
                                <p className="text-[8px] text-primary font-bold mb-0.5">Active Pool</p>
                                <p className="text-xl font-bold text-primary text-shadow-glow">
                                    {tasks.filter(t => t.isActive).length}
                                </p>
                            </div>
                            <div className="border border-white/10 bg-white/5 p-3 text-center uppercase">
                                <p className="text-[8px] text-gray-500 font-bold mb-0.5">Total Active Weight</p>
                                <p className="text-xl font-bold text-white">{totalActiveWeight}</p>
                            </div>
                        </div>

                        {/* Tasks List */}
                        <div className="border border-white/20 bg-black p-4">
                            <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Deployed Missions Pool</h3>
                                <button
                                    onClick={fetchTasks}
                                    className="text-[9px] text-gray-500 hover:text-white uppercase border border-gray-800 px-1.5 py-0.5"
                                >
                                    Refresh Pool
                                </button>
                            </div>

                            {dashboardError && (
                                <div className="border border-red-600 bg-red-950/20 text-red-500 p-2 text-xs uppercase mb-4">
                                    Error: {dashboardError}
                                </div>
                            )}

                            {loadingTasks ? (
                                <div className="text-center py-10 uppercase text-xs text-gray-600 animate-pulse">
                                    Loading Tasks Database...
                                </div>
                            ) : tasks.length === 0 ? (
                                <div className="text-center py-10 uppercase text-xs text-gray-600 italic">
                                    Tasks Pool is empty
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                                    {tasks.map(t => (
                                        <div
                                            key={t._id}
                                            className={`border p-3 transition-all ${t.isActive ? 'border-primary/50 hover:border-primary bg-primary/5' : 'border-gray-800 opacity-60 hover:opacity-100 bg-black'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-xs uppercase text-white tracking-wider flex items-center gap-1.5">
                                                        {t.isActive ? (
                                                            <span className="w-1.5 h-1.5 bg-[#00ff00] animate-pulse"></span>
                                                        ) : (
                                                            <span className="w-1.5 h-1.5 bg-gray-800"></span>
                                                        )}
                                                        {t.title}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 mt-1">{t.description}</p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[9px] text-primary border border-primary/30 bg-primary/10 px-1 py-0.5 font-bold">
                                                        +{t.points} PTS
                                                    </span>
                                                    <p className="text-[8px] text-gray-500 uppercase mt-1">
                                                        Weight: {t.weight} ({t.relativePriority || 0}%)
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Quest Action Specifications */}
                                            <div className="border border-primary/20 bg-primary/5 p-2 my-2 text-[10px] uppercase space-y-1">
                                                <div>Verification: <strong className="text-white">{t.actionType || 'claim'}</strong></div>
                                                {t.actionTarget && (
                                                    <div className="font-mono text-[9px] normal-case truncate">
                                                        Target: <strong className="text-primary break-all">{t.actionTarget}</strong>
                                                    </div>
                                                )}
                                                {t.actionSubtype && (
                                                    <div>Subtype: <strong className="text-yellow-500">{t.actionSubtype}</strong></div>
                                                )}
                                            </div>

                                            {/* Action Link & Deadline */}
                                            <div className="flex gap-4 text-[9px] text-gray-500 border-t border-white/5 pt-2 mt-2 uppercase">
                                                <span>UI Style: <strong className="text-white">{t.buttonType}</strong></span>
                                                {t.actionLink && (
                                                    <span className="truncate max-w-[200px]">
                                                        Fallback URL: <strong className="text-white font-mono lowercase">{t.actionLink}</strong>
                                                    </span>
                                                )}
                                                <span>
                                                    Time Span: {' '}
                                                    <strong className={t.timeSpan?.type === 'custom' ? 'text-yellow-500' : 'text-white'}>
                                                        {t.timeSpan?.type === 'custom' && t.timeSpan?.deadline
                                                            ? `Expires: ${new Date(t.timeSpan.deadline).toLocaleString('en-US', { hour12: false })}`
                                                            : 'Infinite'
                                                        }
                                                    </strong>
                                                </span>
                                            </div>

                                            {/* Conditions display */}
                                            {t.conditions && t.conditions.length > 0 && (
                                                <div className="border border-white/5 bg-black/40 p-2 mt-2">
                                                    <p className="text-[8px] text-gray-500 font-bold mb-1 uppercase">Eligibility logic:</p>
                                                    <div className="flex flex-wrap gap-1 items-center">
                                                        {t.conditions.map((c, i) => (
                                                            <span key={i} className="text-[8px] font-mono leading-tight">
                                                                {i > 0 && <strong className="text-primary px-0.5">{c.logicalOperator}</strong>}
                                                                <span className="text-gray-400">{c.field.replace(/(profile\.|userStats\.stats\.)/, '')}</span>
                                                                <strong className="text-white px-0.5">{c.operator}</strong>
                                                                {!['true', 'false'].includes(c.operator) && (
                                                                    <span className="text-[#00ff00] font-bold">"{c.value}"</span>
                                                                )}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Controls */}
                                            <div className="flex justify-end gap-3 mt-3 pt-2 border-t border-white/5">
                                                <button
                                                    onClick={() => handleToggleActiveClick(t)}
                                                    className={`text-[9px] uppercase border px-2 py-0.5 transition-all ${t.isActive ? 'border-[#00ff00]/40 text-[#00ff00] hover:bg-[#00ff00] hover:text-black' : 'border-gray-700 text-gray-500 hover:bg-gray-800'}`}
                                                >
                                                    {t.isActive ? 'DEACTIVATE' : 'ACTIVATE'}
                                                </button>
                                                <button
                                                    onClick={() => handleEditClick(t)}
                                                    className="text-[9px] text-white border border-white/30 hover:bg-white hover:text-black px-2 py-0.5 uppercase transition-all"
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(t._id!)}
                                                    className="text-[9px] text-red-500 border border-red-500/40 hover:bg-red-500 hover:text-black px-2 py-0.5 uppercase transition-all"
                                                >
                                                    DELETE
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- 2. USERS TAB VIEW --- */}
            {adminTab === 'users' && (
                <div className="space-y-4 animate-fadeIn">
                    
                    {/* Stats Dashboard Box */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="border border-white/10 bg-white/5 p-3 text-center uppercase">
                            <p className="text-[8px] text-gray-500 font-bold mb-0.5">Total Users</p>
                            <p className="text-xl font-bold text-white">{users.length}</p>
                        </div>
                        <div className="border border-primary bg-primary/5 p-3 text-center uppercase">
                            <p className="text-[8px] text-primary font-bold mb-0.5">Active Streaks (&gt; 0 days)</p>
                            <p className="text-xl font-bold text-primary text-shadow-glow">
                                {users.filter(u => (u.streak?.current || 0) > 0).length}
                            </p>
                        </div>
                        <div className="border border-white/10 bg-white/5 p-3 text-center uppercase">
                            <p className="text-[8px] text-gray-500 font-bold mb-0.5">Cumulative Grind Points</p>
                            <p className="text-xl font-bold text-white">
                                {users.reduce((sum, u) => sum + (u.points || 0), 0)}
                            </p>
                        </div>
                    </div>

                    {/* Filter & Search Bar Controls */}
                    <div className="border-2 border-primary bg-black p-4 shadow-[4px_4px_0_0_theme('colors.primary')] space-y-4">
                        <div className="flex justify-between items-center border-b border-primary/20 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-primary">DATABASE_FILTERS_AND_CONTROLS</span>
                            <button
                                onClick={fetchUsers}
                                className="text-[9px] text-gray-500 hover:text-white uppercase border border-gray-800 px-1.5 py-0.5 font-bold"
                            >
                                Re-fetch Accounts
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            {/* Search Query */}
                            <div className="md:col-span-6">
                                <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Search Account</label>
                                <input
                                    type="text"
                                    value={userSearch}
                                    onChange={e => setUserSearch(e.target.value)}
                                    placeholder="SEARCH BY FID, USERNAME, OR WALLET ADDRESS..."
                                    className="block w-full border border-white/20 bg-black px-3 py-2 text-white placeholder-gray-800 focus:border-primary focus:outline-none rounded-none text-xs font-mono"
                                />
                            </div>

                            {/* Sort Selection */}
                            <div className="md:col-span-3">
                                <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Sort Fields</label>
                                <select
                                    value={userSort}
                                    onChange={e => setUserSort(e.target.value as any)}
                                    className="block w-full border border-white/20 bg-black px-3 py-2 text-white focus:border-primary focus:outline-none rounded-none text-xs font-bold"
                                >
                                    <option value="points">Points (Highest first)</option>
                                    <option value="streak">Current Streak (Highest first)</option>
                                    <option value="onchain">Onchain Reputation (Highest first)</option>
                                    <option value="joined">Date Joined (Newest first)</option>
                                </select>
                            </div>

                            {/* Filters Selection Toggles */}
                            <div className="md:col-span-3 flex flex-col justify-end space-y-2 text-[10px] uppercase pt-1">
                                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-gray-400 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={userFilterActiveStreak}
                                        onChange={e => setUserFilterActiveStreak(e.target.checked)}
                                        className="accent-primary"
                                    />
                                    Active Streak
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-gray-400 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={userFilterHasReferrals}
                                        onChange={e => setUserFilterHasReferrals(e.target.checked)}
                                        className="accent-primary"
                                    />
                                    Has Invitees
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-bold select-none text-gray-400 hover:text-white">
                                    <input
                                        type="checkbox"
                                        checked={userFilterHasNFT}
                                        onChange={e => setUserFilterHasNFT(e.target.checked)}
                                        className="accent-primary"
                                    />
                                    Minted NFT
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Users list Table */}
                    <div className="border border-white/20 bg-black p-4 overflow-x-auto">
                        {usersError && (
                            <div className="border border-red-600 bg-red-950/20 text-red-500 p-2 text-xs uppercase">
                                Error: {usersError}
                            </div>
                        )}

                        {loadingUsers ? (
                            <div className="text-center py-20 uppercase text-xs text-gray-600 animate-pulse">
                                Pulling Registered Echo Profiles...
                            </div>
                        ) : getFilteredAndSortedUsers().length === 0 ? (
                            <div className="text-center py-20 uppercase text-xs text-gray-600 italic">
                                No profiles match search/filter options.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b-2 border-white/20 text-[9px] font-bold text-gray-500 uppercase">
                                        <th className="py-2.5 pl-2">FID</th>
                                        <th className="py-2.5">USERNAME</th>
                                        <th className="py-2.5">VERIFIED ADDRESS</th>
                                        <th className="py-2.5 text-right">POINTS</th>
                                        <th className="py-2.5 text-right">REP SCORE</th>
                                        <th className="py-2.5 text-center">STREAK (CURR/BEST)</th>
                                        <th className="py-2.5 text-center">INVITES</th>
                                        <th className="py-2.5 text-center">NFT TOKEN</th>
                                        <th className="py-2.5 pr-2 text-right">DATE JOINED</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[11px] font-mono">
                                    {getFilteredAndSortedUsers().map((user) => (
                                        <tr key={user.fid} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            {/* FID */}
                                            <td className="py-3 pl-2 text-gray-400 font-bold">{user.fid}</td>
                                            
                                            {/* Username */}
                                            <td className="py-3 text-white uppercase font-bold tracking-wider">
                                                {user.username ? (
                                                    <a 
                                                        href={`https://warpcast.com/${user.username}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="hover:underline hover:text-primary"
                                                    >
                                                        @{user.username}
                                                    </a>
                                                ) : 'N/A'}
                                            </td>

                                            {/* Address */}
                                            <td className="py-3 text-gray-500 select-all break-all lowercase max-w-[150px] truncate" title={user.address}>
                                                {user.address ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}` : 'N/A'}
                                            </td>

                                            {/* Points */}
                                            <td className="py-3 text-right pr-2 text-[#00ff00] font-bold">
                                                {user.points || 0} PTS
                                            </td>

                                            {/* Onchain score */}
                                            <td className="py-3 text-right pr-2 text-primary font-bold">
                                                {user.onchainScore || 0}
                                            </td>

                                            {/* Streak */}
                                            <td className="py-3 text-center text-white">
                                                {user.streak?.current || 0}d / {user.streak?.highest || 0}d
                                            </td>

                                            {/* Invites Count */}
                                            <td className="py-3 text-center text-gray-400">
                                                {user.referralStats?.count || 0}
                                            </td>

                                            {/* NFT Badge Token ID */}
                                            <td className="py-3 text-center text-yellow-500 font-bold">
                                                {user.nftTokenId !== null && user.nftTokenId !== undefined ? (
                                                    <span className="border border-yellow-500/50 bg-yellow-500/10 px-1 py-0.5">
                                                        #{user.nftTokenId}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-700">-</span>
                                                )}
                                            </td>

                                            {/* Date Joined */}
                                            <td className="py-3 pr-2 text-right text-gray-400">
                                                {new Date(user.createdAt || 0).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
