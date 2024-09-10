import { Business } from "../models/Business.model.js";
import { sendEmail } from "../services/mail/mail.service.js";
import { render } from 'pug';
import { readFileSync } from 'fs';
import path from "path";
import { dirname } from '../lib/index.js';
import { Location } from "../models/Location.model.js";

export const getAllBusinesses = async (req, res) => {
    try {
        if (req.user?.role !== "admin") {
            return res.status(403).json({ message: "You are not an admin" });
        }
        
        if (req.query.status === "pending") {
            const allBusinesses = await Business.find({ businessVerified: "pending" });
            
            res.status(200).json(allBusinesses);
        } else {
            const allBusinesses = await Business.find({ businessVerified: { $in: ["verified", "denied"] } });
            
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

export const deleteBusinessProfile = async (req, res) => {
	try {
		const business = await Business.findById(req.params.id);

		if (!business) return res.status(404).json({ message: "Business not found" });
		if (req.user.role !== "admin") return res.status(401).json({ error: "You can't delete this account" });

		await Location.findOneAndDelete({ business: req.params.id });

		if (business) await Business.findByIdAndDelete(req.params.id);

		return res.status(200).json({ message: "Business deleted successfully" });
	} catch(err) {
		return res.status(500).json({ error: err.message });
	} 
};
