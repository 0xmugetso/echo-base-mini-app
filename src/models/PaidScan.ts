import mongoose, { Schema } from 'mongoose';

export interface IPaidScan {
    fid: number;               // Farcaster FID of the user who paid
    address: string;           // The scanned Ethereum address
    stats: any;                // The stats object returned by the API
    txHash?: string;           // Transaction hash of the payment proof
    scannedAt: Date;           // Timestamp of the scan
}

const PaidScanSchema = new Schema<IPaidScan>(
    {
        fid: { type: Number, required: true, index: true },
        address: { type: String, required: true, index: true },
        stats: { type: Schema.Types.Mixed, required: true },
        txHash: { type: String, default: null },
        scannedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Ensure a user has only one paid scan record per address
PaidScanSchema.index({ fid: 1, address: 1 }, { unique: true });

const PaidScan = mongoose.models.PaidScan || mongoose.model<IPaidScan>('PaidScan', PaidScanSchema);

export default PaidScan;
