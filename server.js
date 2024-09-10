import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import passport from 'passport';
import fs from 'fs';
// import { createLocation } from "./controllers/location.controllers.js";
import businessRouter from './routes/business.routes.js';
import locationRouter from './routes/location.routes.js';
import userRouter from './routes/user.routes.js';
import adminRouter from './routes/admin.routes.js';

import locationv2 from './routes/locationv2.router.js';

import { JwtPassport } from './config/passport.js';
import payRouter from './routes/paystack.routes.js';
import path from 'path';
import { dirname } from './lib/index.js';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

import Logger from '@peteradeojo/laas-sdk';
import LocationBudget from './models/LocationBudget.js';

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(morgan('common'));

let sessionStore = undefined;

let states;
try {
	states = fs.readFileSync('./lib/data.json');
} catch (error) {
	console.error(error);
}

let categories;
try {
	categories = fs.readFileSync('./lib/categories.json');
} catch (error) {
	console.error(error);
}

if (process.env.NODE_ENV == 'production') {
	const client = new Redis({
		host: process.env.REDIS_HOST,
		password: process.env.REDIS_PASSWORD,
		port: process.env.REDIS_PORT,
		user: process.env.REDIS_USER,
		// tls: {},
		reconnectOnError(err) {
			console.error(err);
			return false;
		},
	});
	client.on('error', (error) => {
		console.error(error);
	});

	client.on('connect', () => {
		console.log('Connected to redis db');
	});

	sessionStore = new RedisStore({
		client,
	});
}

app.set('view engine', 'pug');
app.set('views', path.join(dirname(import.meta.url), '/views/'));

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(bodyParser.json({ limit: '30mb', extended: true }));
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true }));

app.use(express.static(path.join(dirname(import.meta.url), 'public/')));

var whitelist = [
	'http://localhost:3000',
	'http://www.localhost:3000',
	'http://172.20.10.9:3000',
	'http://www.172.20.10.9:3000',
	'https://travaye-beta.netlify.app',
	'https://www.travaye-beta.netlify.app',
	'https://travaye-frontend.vercel.app',
	'https://www.travaye-frontend.vercel.app',
	'https://travaye-frontend-git-staging-tra-va-yes-projects.vercel.app',
];
var corsOptions = {
	origin:
		process.env.NODE_ENV != 'production'
			? '*'
			: function (origin, callback) {
					console.log(origin);
					if (origin == undefined || whitelist.indexOf(origin) !== -1) {
						callback(null, true);
					} else {
						callback(new Error('Not allowed by CORS'));
					}
			},
	};

app.use(cors(corsOptions));
app.use(
	session({
		secret: 'LolSecretIsHere',
		resave: true,
		saveUninitialized: true,
		store: sessionStore,
	})
);
app.use(cookieParser());
app.use(passport.initialize());

JwtPassport(passport);

// ROUTES WITH FILES
// app.post(
//   "/api/location",
//   // (req, res, next) => {
//   //   if (req.isAuthenticated()) {
//   //     next();
//   //   } else {
//   //     res.status(403).json({ error: "Sorry you're not allowed in this Zone." });
//   //   }
//   // },
//   upload.array("pictures"),
//   createLocation
// );

// ROUTES
app.use('/api/user', userRouter);
app.use('/api/business', businessRouter);
app.use('/api/location', locationRouter);
app.use('/api/locations', locationv2);
app.use('/api/pay', payRouter);
app.use('/api/admin', adminRouter);
app.get('/api/states', (req, res) => {
	return res.json(JSON.parse(states));
});
app.use('/api/budgets', async (req, res) => {
	return res.json(await LocationBudget.find().sort('+min'));
});

app.get(
	'/api/categories',
	(req, res) => {
		return res.json(
		JSON.parse(categories)
	);
	}
);

app.use((err, req, res, next) => {
	if (err) {
		console.log(err);
		Logger.sendLog({
			level: 'error',
			text: err.message,
			context: {
				stack: err.stack
			}
		}, process.env.DOPPLER_TOKEN);s
		res.status(500).json({ error: err.message });
	}
});

// Server Listener
async function connectDbAndListen() {
	try {
		const {
			connection: { host, port },
		} = await mongoose.connect(process.env.MONGODB_URL, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log(`Database connected on ${host}:${port}`);

		if ((await LocationBudget.countDocuments()) < 1) {
			LocationBudget.create({ min: 0, max: 0, label: 'Free' });
			LocationBudget.create({ min: 0, max: 5000, label: 'Free - 5k' });
			LocationBudget.create({ min: 5000, max: 10000, label: '5k - 10k' });
			LocationBudget.create({ min: 10000, max: 20000, label: '10k - 20k' });
			LocationBudget.create({ min: 20000, max: undefined, label: '20k+' });
		}
	} catch (error) {
		console.log(error.message);
	}
	app.listen(process.env.PORT, () => {
		console.log(`Listening on http://localhost:${process.env.PORT}`);
	});
}
await connectDbAndListen();
