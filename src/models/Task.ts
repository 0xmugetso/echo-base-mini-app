import mongoose, { Schema, model, models } from 'mongoose';

export interface ITaskCondition {
    logicalOperator: 'IF' | 'AND' | 'OR';
    field: string;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal' | 'true' | 'false' | 'contains';
    value: string;
}

export interface ITask {
    title: string;
    description: string;
    actionLink: string;
    buttonType: 'switch' | 'button' | 'input';
    weight: number; // Raw weight for priority calculations
    points: number; // Points reward
    timeSpan: {
        type: 'infinite' | 'custom';
        deadline?: Date | null;
    };
    conditions: ITaskCondition[];
    isActive: boolean;
    // Extended fields for follow, engage, and raid actions
    actionType: 'claim' | 'follow' | 'engage' | 'raid';
    actionTarget: string; // Farcaster username/link, cast URL, or template message text
    actionSubtype?: 'like' | 'recast' | 'comment' | ''; // Engagement subtypes
    createdAt: Date;
    updatedAt: Date;
}

const TaskConditionSchema = new Schema<ITaskCondition>({
    logicalOperator: { type: String, enum: ['IF', 'AND', 'OR'], default: 'IF' },
    field: { type: String, required: true },
    operator: { type: String, required: true },
    value: { type: String, default: '' }
});

const TaskSchema = new Schema<ITask>(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        actionLink: { type: String, default: '' },
        buttonType: { type: String, enum: ['switch', 'button', 'input'], default: 'button' },
        weight: { type: Number, required: true, default: 0 },
        points: { type: Number, required: true, default: 0 },
        timeSpan: {
            type: { type: String, enum: ['infinite', 'custom'], default: 'infinite' },
            deadline: { type: Date, default: null }
        },
        conditions: { type: [TaskConditionSchema], default: [] },
        isActive: { type: Boolean, default: true },
        // Advanced Action Configurations
        actionType: { type: String, enum: ['claim', 'follow', 'engage', 'raid'], default: 'claim' },
        actionTarget: { type: String, default: '' },
        actionSubtype: { type: String, enum: ['like', 'recast', 'comment', ''], default: '' }
    },
    { timestamps: true }
);

const Task = models.Task || model<ITask>('Task', TaskSchema);

export default Task;
