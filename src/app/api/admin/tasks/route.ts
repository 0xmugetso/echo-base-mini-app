import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '../../../../lib/db';
import Task from '../../../../models/Task';

async function checkAdminAuth() {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin_token')?.value;
    return adminToken === 'admin_session_active';
}

export async function GET() {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const tasks = await Task.find({}).sort({ createdAt: -1 });

        // Calculate sum of active weights
        const activeTasks = tasks.filter(t => t.isActive);
        const totalActiveWeight = activeTasks.reduce((sum, t) => sum + (t.weight || 0), 0);

        // Map tasks and append calculated relative weights
        const tasksWithPriority = tasks.map(t => {
            const taskObj = t.toObject();
            if (t.isActive && totalActiveWeight > 0) {
                taskObj.relativePriority = parseFloat((( (t.weight || 0) / totalActiveWeight ) * 100).toFixed(2));
            } else {
                taskObj.relativePriority = 0;
            }
            return taskObj;
        });

        return NextResponse.json({
            success: true,
            tasks: tasksWithPriority,
            totalActiveWeight
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!(await checkAdminAuth())) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const body = await request.json();
        const { title, description, actionLink, buttonType, weight, points, timeSpan, conditions, isActive, actionType, actionTarget, actionSubtype } = body;

        if (!title || !description) {
            return NextResponse.json({ error: 'Missing title or description' }, { status: 400 });
        }

        const newTask = new Task({
            title,
            description,
            actionLink: actionLink || '',
            buttonType: buttonType || 'button',
            weight: Number(weight) || 0,
            points: Number(points) || 0,
            timeSpan: {
                type: timeSpan?.type || 'infinite',
                deadline: timeSpan?.deadline ? new Date(timeSpan.deadline) : null
            },
            conditions: conditions || [],
            isActive: isActive !== undefined ? isActive : true,
            actionType: actionType || 'claim',
            actionTarget: actionTarget || '',
            actionSubtype: actionSubtype || ''
        });

        await newTask.save();
        return NextResponse.json({ success: true, task: newTask });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
