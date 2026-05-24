import { NextResponse } from 'next/server';
import dbConnect from '../../../../lib/db';
import Task from '../../../../models/Task';
import EchoProfile from '../../../../models/EchoProfile';
import UserStats from '../../../../models/UserStats';

function getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => {
        if (acc === null || acc === undefined) return undefined;
        return acc[part];
    }, obj);
}

export function evaluateConditions(conditions: any[], profile: any, userStats: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    let result = true;

    for (let i = 0; i < conditions.length; i++) {
        const cond = conditions[i];
        
        let val: any = undefined;
        if (cond.field.startsWith('profile.')) {
            val = getNestedValue(profile, cond.field.replace('profile.', ''));
        } else if (cond.field.startsWith('userStats.')) {
            val = getNestedValue(userStats, cond.field.replace('userStats.', ''));
        } else {
            // Fallback: search profile, then userStats
            val = getNestedValue(profile, cond.field) ?? getNestedValue(userStats, cond.field);
        }

        let condPassed = false;
        const targetValue = cond.value;

        switch (cond.operator) {
            case 'equals':
                condPassed = String(val) === String(targetValue);
                break;
            case 'not_equals':
                condPassed = String(val) !== String(targetValue);
                break;
            case 'greater_than':
                condPassed = Number(val) > Number(targetValue);
                break;
            case 'less_than':
                condPassed = Number(val) < Number(targetValue);
                break;
            case 'greater_than_or_equal':
                condPassed = Number(val) >= Number(targetValue);
                break;
            case 'less_than_or_equal':
                condPassed = Number(val) <= Number(targetValue);
                break;
            case 'true':
                condPassed = val === true || String(val).toLowerCase() === 'true';
                break;
            case 'false':
                condPassed = val === false || String(val).toLowerCase() === 'false';
                break;
            case 'contains':
                condPassed = String(val).toLowerCase().includes(String(targetValue).toLowerCase());
                break;
            default:
                condPassed = false;
        }

        if (i === 0 || cond.logicalOperator === 'IF') {
            result = condPassed;
        } else if (cond.logicalOperator === 'AND') {
            result = result && condPassed;
        } else if (cond.logicalOperator === 'OR') {
            result = result || condPassed;
        }
    }

    return result;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const fidParam = searchParams.get('fid');

    if (!fidParam) {
        return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    try {
        await dbConnect();
        const fid = parseInt(fidParam);

        // Fetch User Profile
        const profile = await EchoProfile.findOne({ fid });
        if (!profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        // Fetch User Stats (using address connected to profile)
        let userStats = null;
        if (profile.address) {
            userStats = await UserStats.findOne({
                address: { $regex: new RegExp(`^${profile.address}$`, 'i') }
            });
        }

        const now = new Date();

        // Query active tasks
        const activeTasks = await Task.find({
            isActive: true,
            $or: [
                { 'timeSpan.type': 'infinite' },
                { 
                    'timeSpan.type': 'custom', 
                    'timeSpan.deadline': { $gte: now } 
                }
            ]
        });

        // Compute total active weight
        const totalActiveWeight = activeTasks.reduce((sum, t) => sum + (t.weight || 0), 0);

        // Map and evaluate dynamic statuses
        const evaluatedTasks = activeTasks.map(t => {
            const isCompleted = profile.dailyActions?.completedTasks?.includes(t._id.toString()) || false;
            
            // Evaluate dynamic conditions
            const isEligible = isCompleted || evaluateConditions(t.conditions || [], profile, userStats);

            const taskObj = t.toObject();

            // Append dynamic custom fields
            taskObj.isCompleted = isCompleted;
            taskObj.isEligible = isEligible;
            taskObj.relativePriority = totalActiveWeight > 0 
                ? parseFloat((( (t.weight || 0) / totalActiveWeight ) * 100).toFixed(2)) 
                : 0;

            return taskObj;
        });

        // Sort tasks: put completed ones at the bottom, eligible ones first, and sort by weight/priority descending
        evaluatedTasks.sort((a, b) => {
            if (a.isCompleted !== b.isCompleted) {
                return a.isCompleted ? 1 : -1;
            }
            if (a.isEligible !== b.isEligible) {
                return a.isEligible ? -1 : 1;
            }
            return (b.weight || 0) - (a.weight || 0);
        });

        return NextResponse.json({
            success: true,
            tasks: evaluatedTasks,
            totalActiveWeight
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
