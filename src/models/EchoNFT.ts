import mongoose, { Schema, model, models } from 'mongoose';

export interface IEchoNFT {
    tokenId: number;
    fid: number;
    address: string;
    imageUrl: string;
    points: number;
    mintedAt: Date;
}

const EchoNFTSchema = new Schema<IEchoNFT>({
    tokenId: { type: Number, required: true, unique: true },
    fid: { type: Number, required: true, index: true },
    address: { type: String, required: true },
    imageUrl: { type: String, required: true },
    points: { type: Number, default: 0 },
    mintedAt: { type: Date, default: Date.now }
});

const EchoNFT = models.EchoNFT || model<IEchoNFT>('EchoNFT', EchoNFTSchema);

export default EchoNFT;
