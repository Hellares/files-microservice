// import 'dotenv/config';
// import * as joi from 'joi';

// interface EnvVars {
//     PORT: number;
//     RABBITMQ_SERVERS: string[];
//     STORAGE_TYPE: 'local' | 's3' | 'cloudinary' | 'firebase';
//     LOCAL_STORAGE_PATH: string;
//     AWS_BUCKET_NAME?: string;
//     AWS_REGION?: string;
//     AWS_ACCESS_KEY?: string;
//     AWS_SECRET_KEY?: string;
//     CLOUDINARY_CLOUD_NAME?: string;
//     CLOUDINARY_API_KEY?: string;
//     CLOUDINARY_API_SECRET?: string;
//     FIREBASE_PROJECT_ID?: string;
//     FIREBASE_CLIENT_EMAIL?: string;
//     FIREBASE_PRIVATE_KEY?: string;
//     FIREBASE_STORAGE_BUCKET?: string;
// }

// const envsSchema = joi.object({
//     PORT: joi.number().required(),
//     RABBITMQ_SERVERS: joi.array().items(joi.string()).required(),
//     STORAGE_TYPE: joi.string().valid('local', 's3', 'cloudinary', 'firebase').required(),
//     LOCAL_STORAGE_PATH: joi.string().default('./uploads'),
//     AWS_BUCKET_NAME: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
//     AWS_REGION: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
//     AWS_ACCESS_KEY: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
//     AWS_SECRET_KEY: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
//     CLOUDINARY_CLOUD_NAME: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
//     CLOUDINARY_API_KEY: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
//     CLOUDINARY_API_SECRET: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
//     FIREBASE_PROJECT_ID: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
//     FIREBASE_CLIENT_EMAIL: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
//     FIREBASE_PRIVATE_KEY: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
//     FIREBASE_STORAGE_BUCKET: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() })
// })
// .unknown(true);

// const { error, value } = envsSchema.validate({
//     ...process.env,
//     RABBITMQ_SERVERS: process.env.RABBITMQ_SERVERS?.split(',')
// });

// if (error) {
//     throw new Error(`Config validation error: ${error.message}`);
// }

// const envVars: EnvVars = value;

// export const envs = {
//     port: envVars.PORT,
//     rabbitmqServers: envVars.RABBITMQ_SERVERS,
//     storage: {
//         type: envVars.STORAGE_TYPE,
//         local: {
//             path: envVars.LOCAL_STORAGE_PATH
//         },
//         s3: {
//             bucket: envVars.AWS_BUCKET_NAME,
//             region: envVars.AWS_REGION,
//             accessKey: envVars.AWS_ACCESS_KEY,
//             secretKey: envVars.AWS_SECRET_KEY
//         },
//         cloudinary: {
//             cloudName: envVars.CLOUDINARY_CLOUD_NAME,
//             apiKey: envVars.CLOUDINARY_API_KEY,
//             apiSecret: envVars.CLOUDINARY_API_SECRET
//         },
//         firebase: {
//             projectId: envVars.FIREBASE_PROJECT_ID,
//             clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
//             privateKey: envVars.FIREBASE_PRIVATE_KEY,
//             storageBucket: envVars.FIREBASE_STORAGE_BUCKET
//         }
//     }
// };

import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    RABBITMQ_SERVERS: string[];
    STORAGE_TYPE: 'local' | 's3' | 'cloudinary' | 'firebase';
    LOCAL_STORAGE_PATH: string;
    MAX_FILE_SIZE: number;
    UPLOAD_TIMEOUT: number;
    AWS_BUCKET_NAME?: string;
    AWS_REGION?: string;
    AWS_ACCESS_KEY?: string;
    AWS_SECRET_KEY?: string;
    CLOUDINARY_CLOUD_NAME?: string;
    CLOUDINARY_API_KEY?: string;
    CLOUDINARY_API_SECRET?: string;
    FIREBASE_PROJECT_ID?: string;
    FIREBASE_CLIENT_EMAIL?: string;
    FIREBASE_PRIVATE_KEY?: string;
    FIREBASE_STORAGE_BUCKET?: string;
}

const envsSchema = joi.object({
    PORT: joi.number().required(),
    RABBITMQ_SERVERS: joi.array().items(joi.string()).required(),
    STORAGE_TYPE: joi.string().valid('local', 's3', 'cloudinary', 'firebase').required(),
    LOCAL_STORAGE_PATH: joi.string().default('./uploads'),
    MAX_FILE_SIZE: joi.number().default(20 * 1024 * 1024), // 20MB por defecto
    UPLOAD_TIMEOUT: joi.number().default(120000), // 2 minutos por defecto
    AWS_BUCKET_NAME: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
    AWS_REGION: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
    AWS_ACCESS_KEY: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
    AWS_SECRET_KEY: joi.string().when('STORAGE_TYPE', { is: 's3', then: joi.required() }),
    CLOUDINARY_CLOUD_NAME: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
    CLOUDINARY_API_KEY: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
    CLOUDINARY_API_SECRET: joi.string().when('STORAGE_TYPE', { is: 'cloudinary', then: joi.required() }),
    FIREBASE_PROJECT_ID: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
    FIREBASE_CLIENT_EMAIL: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
    FIREBASE_PRIVATE_KEY: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() }),
    FIREBASE_STORAGE_BUCKET: joi.string().when('STORAGE_TYPE', { is: 'firebase', then: joi.required() })
})
.unknown(true);

const { error, value } = envsSchema.validate({
    ...process.env,
    RABBITMQ_SERVERS: process.env.RABBITMQ_SERVERS?.split(','),
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '20971520'),
    UPLOAD_TIMEOUT: parseInt(process.env.UPLOAD_TIMEOUT || '120000')
});

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
    port: envVars.PORT,
    rabbitmqServers: envVars.RABBITMQ_SERVERS,
    maxFileSize: envVars.MAX_FILE_SIZE,
    uploadTimeout: envVars.UPLOAD_TIMEOUT,
    storage: {
        type: envVars.STORAGE_TYPE,
        local: {
            path: envVars.LOCAL_STORAGE_PATH
        },
        s3: {
            bucket: envVars.AWS_BUCKET_NAME,
            region: envVars.AWS_REGION,
            accessKey: envVars.AWS_ACCESS_KEY,
            secretKey: envVars.AWS_SECRET_KEY
        },
        cloudinary: {
            cloudName: envVars.CLOUDINARY_CLOUD_NAME,
            apiKey: envVars.CLOUDINARY_API_KEY,
            apiSecret: envVars.CLOUDINARY_API_SECRET
        },
        firebase: {
            projectId: envVars.FIREBASE_PROJECT_ID,
            clientEmail: envVars.FIREBASE_CLIENT_EMAIL,
            privateKey: envVars.FIREBASE_PRIVATE_KEY,
            storageBucket: envVars.FIREBASE_STORAGE_BUCKET
        }
    }
};