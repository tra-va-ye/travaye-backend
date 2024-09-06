import { Business } from "../models/Business.model.js";
import { sendEmail } from "../services/mail/mail.service.js";
import { render } from 'pug';
import { readFileSync } from 'fs';
import path from "path";
import { dirname } from '../lib/index.js';

export const getAllBusinesses = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "You are not an admin" });
        }
        
        if (req.query.status === "pending") {
            const allBusinesses = await Business.find({ businessVerified: { $in: ["pending", "denied"] } });
            
            res.status(200).json(allBusinesses);
        } else {
            const allBusinesses = await Business.find();
            
            res.status(200).json(allBusinesses);
        }
    } catch(err) {
        return res.status(500).json({ message: err.message });
    }
};

export const getBusinessByID = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "You are not an admin" });
        }

        const businessFound = await Business.findById(req.params.id)
        .populate('budgetClass')
        .select(['+businessCacProofImageURL', '+businessProofAddressImageURL'])
        .lean();
        
        if (!businessFound) {
            return res.status(404).json({ message: "Business doesn't exist" });
        }

        res.status(200).json(businessFound);
    } catch(err) {
        return res.status(500).json({ message: err.message });
    }
}

export const acceptOrDenyApproval = async (req, res) => {
    try {
        const { isVerified } = req.query;

        const businessFound = await Business.findById(req.params.id)
        .populate('budgetClass')
        .select(['+businessCacProofImageURL', '+businessProofAddressImageURL'])
        .lean();

        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "You are not an admin" });
        }

        if (!businessFound) {
            return res.status(404).json({ message: "Business doesn't exist" });
        }

        if (isVerified == "true") {
            await Business.findByIdAndUpdate(req.params.id, { businessVerified: "verified" });
            
            const mail = render(
                readFileSync(
                    path.resolve(
                        dirname(import.meta.url),
                        '../views/email/accept-location.pug'
                    )
                ),
                {
                    filename: 'acceptance-location'
                }
            );
            
            await sendEmail(businessFound.businessEmail, mail, 'Business Accepted');
            
            return res.status(200).json({ message: "Business Verified" });
        } else {
            await Business.findByIdAndUpdate(req.params.id, { businessVerified: "denied" });
            return res.status(200).json({ message: "Business Denied" });
        }

    } catch(err) {
		return res.status(500).json({ message: err.message });
    }
}
