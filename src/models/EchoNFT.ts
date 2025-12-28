import mongoose, { Schema, model, models } from 'mongoose';

export interface IEchoNFT {
    tokenId: number;
    fid: number;
    address: string;
    imageUrl: string;
    points: number;
    mintedAt: Date;

    // Snapshot Stats
    username?: string;
    neynarScore?: number;
    castCount?: number;
    totalTx?: number;
    totalVolume?: number;
    gasPaid?: string;
    biggestTx?: number;
    joinDate?: string;
}

const EchoNFTSchema = new Schema<IEchoNFT>({
    tokenId: { type: Number, required: true, unique: true },
    fid: { type: Number, required: true, index: true },
    address: { type: String, required: true },
    imageUrl: { type: String, required: true },
    points: { type: Number, default: 0 },
    mintedAt: { type: Date, default: Date.now },

    // Snapshot Fields
    username: { type: String },
    neynarScore: { type: Number },
    castCount: { type: Number },
    totalTx: { type: Number },
    totalVolume: { type: Number },
    gasPaid: { type: String },
    biggestTx: { type: Number },
    joinDate: { type: String }
});

const EchoNFT = mongoose.models.EchoNFT || mongoose.model<IEchoNFT>('EchoNFT', EchoNFTSchema);

export default EchoNFT;
