import mongoose, { Schema, model, models } from 'mongoose';

export interface IEchoProfile {
    fid: number;
    username?: string;
    address: string;
    points: number;

    // Streak Info
    streak: {
        current: number;
        highest: number;
        lastCheckIn: Date | null;
    };

    // Referral System
    referralCode?: string;
    referredBy?: number;
    referralStatus?: 'pending' | 'active';
    referralStats?: {
        count: number;
        earnings: number;
    };
    pointsGrinded: number;
    nftTokenId?: number | null;
    nftImage?: string | null;

    // Monthly Activity
    rewards: {
        lastMonthlyReset: Date;
        claimedBoxes: {
            day3: boolean;
            day7: boolean;
            day14: boolean;
            day30: boolean;
        };
    };

    // Activity Log
    dailyActions: {
        lastCastDate: string | null; // YYYY-MM-DD
        completedTasks: string[];
        castHistory?: {
            hash?: string;
            text?: string;
            date?: Date;
            points?: number;
            likes?: number;
            recasts?: number;
        }[];
    };

    lastUpdated: Date;
}

const EchoProfileSchema = new Schema<IEchoProfile>(
    {
        fid: { type: Number, required: true, unique: true, index: true },
        username: { type: String, default: null },
        address: { type: String, required: true }, // Verified address from context
        points: { type: Number, default: 0 },
        // Track points earned strictly from actions for referral calc
        pointsGrinded: { type: Number, default: 0 },

        // Referral System
        referralCode: { type: String, unique: true, sparse: true }, // e.g. "ECHO_123"
        referredBy: { type: Number, default: null }, // FID
        referralStatus: { type: String, enum: ['pending', 'active'], default: 'pending' },
        referralStats: {
            count: { type: Number, default: 0 },
            earnings: { type: Number, default: 0 }
        },

        // NFT Integration
        nftTokenId: { type: Number, default: null },
        nftImage: { type: String, default: null }, // URL of the screenshot


        streak: {
            current: { type: Number, default: 0 },
            highest: { type: Number, default: 0 },
            lastCheckIn: { type: Date, default: null },
        },

        rewards: {
            lastMonthlyReset: { type: Date, default: Date.now },
            claimedBoxes: {
                day3: { type: Boolean, default: false },
                day7: { type: Boolean, default: false },
                day14: { type: Boolean, default: false },
                day30: { type: Boolean, default: false },
            }
        },

        dailyActions: {
            lastCastDate: { type: String, default: null },
            completedTasks: { type: [String], default: [] },
            castHistory: [{
                hash: String,
                text: String,
                date: { type: Date, default: Date.now },
                points: Number,
                likes: { type: Number, default: 0 },
                recasts: { type: Number, default: 0 }
            }]
        },

        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

const EchoProfile = mongoose.models.EchoProfile || mongoose.model<IEchoProfile>('EchoProfile', EchoProfileSchema);

export default EchoProfile;
