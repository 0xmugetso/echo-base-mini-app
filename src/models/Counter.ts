import mongoose, { Schema, model, models } from 'mongoose';

interface ICounter {
    name: string;
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    name: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 }
});

const Counter = models.Counter || model<ICounter>('Counter', CounterSchema);

export default Counter;
