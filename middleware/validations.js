import Joi from 'joi';

/**
 *
 * @param {any} from
 * @param {Joi.AnySchema} schema
 * @param {Joi.ValidationOptions|undefined} options
 */
export function createValidator(from, schema, options = {}) {
	/**
	 * @type {import('express').RequestHandler}
	 */
	return (req, res, next) => {
		const { error } = schema.validate(req[from], {options});
		if (error) {
			return res.status(400).json({
				error: error.details,
			});
		}

		next();
	};
}

/**
 *
 * @param {Joi.AnySchema} schema
 * @param {Joi.ValidationOptions|undefined} options
 * @returns
 */
export function validateBody(schema, options = {}) {
	/**
	 *
	 * @type {import('express').RequestHandler}
	 */
	return (req, res, next) => {
		const { error } = schema.validate(req.body, options);
		if (error) {
			return res.status(400).json({
				error: error.details,
			});
		}

		next();
	};
}
