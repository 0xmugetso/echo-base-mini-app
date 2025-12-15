import mongoose, { Schema, model, models } from 'mongoose';

// Define the shape of the stats object we are storing
export interface IUserStats {
    address: string;
    stats: {
        total_tx: number;
        total_volume_out_wei: string; // Stored as string to preserve BigInt precision in JSON
        total_volume_usd: number;
        total_fees_paid_wei: string; // Stored as string
        first_tx_date: string | null;
        wallet_age_days: number | null;
        biggest_single_tx: number;
        farcaster?: {
            wallet_value_usd: number;
            holdings: {
                warplets: boolean;
                pro_og: boolean;
                based_punk: boolean;
                bankr_club: boolean;
                clanker: boolean;
                jesse: boolean;
                degen: boolean;
                brett: boolean;
                toshi: boolean;
            };
            best_cast?: {
                hash: string;
                text: string;
                impressions: number;
                likes: number;
                recasts: number;
                replies: number;
            } | null;
        };
    };
    lastUpdated: Date;
}

const UserStatsSchema = new Schema<IUserStats>(
    {
        address: { type: String, required: true, unique: true, index: true },
        stats: {
            total_tx: { type: Number, default: 0 },
            total_volume_out_wei: { type: String, default: "0" },
            total_volume_usd: { type: Number, default: 0 },
            total_fees_paid_wei: { type: String, default: "0" },
            first_tx_date: { type: String, default: null },
            wallet_age_days: { type: Number, default: 0 },
            biggest_single_tx: { type: Number, default: 0 },
            // Farcaster Specific Stats
            farcaster: {
                wallet_value_usd: { type: Number, default: 0 },
                holdings: {
                    warplets: { type: Boolean, default: false },
                    pro_og: { type: Boolean, default: false },
                    based_punk: { type: Boolean, default: false },
                    bankr_club: { type: Boolean, default: false },
                    clanker: { type: Boolean, default: false },
                    jesse: { type: Boolean, default: false },
                    degen: { type: Boolean, default: false },
                    brett: { type: Boolean, default: false },
                    toshi: { type: Boolean, default: false },
                },
                best_cast: {
                    hash: { type: String, default: null },
                    text: { type: String, default: null },
                    impressions: { type: Number, default: 0 },
                    likes: { type: Number, default: 0 },
                    recasts: { type: Number, default: 0 },
                    replies: { type: Number, default: 0 },
                }
            }
        },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

// Prevent overwriting model during hot reloading
const UserStats = models.UserStats || model<IUserStats>('UserStats', UserStatsSchema);

export default UserStats;
