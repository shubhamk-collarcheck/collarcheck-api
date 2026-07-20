import { z } from "zod";

const optionalString = z.union([z.string(), z.number()]).optional().transform((v) =>
	v === undefined || v === null ? undefined : String(v)
);

const optionalTruthy = z.any().optional();

export const sendOtpBodySchema = z.object({
	phone: z.string().min(1, "The Phone field is required."),
	email: z.string().min(1, "The email field is required."),
	international: optionalString,
	name: z.string().min(1, "The name field is required."),
	checkUnique: optionalTruthy,
	referral_code: optionalString,
	send_email: optionalTruthy,
	methodType: optionalString,
	token: optionalString,
});

export const verifyOtpBodySchema = z.object({
	phone: optionalString,
	email: optionalString,
	otp: optionalString,
	emailotp: optionalString,
	login: optionalString,
});

export const socialLoginBodySchema = z.object({
	email: z.string().min(1, "The email field is required."),
	pageType: optionalString,
	name: optionalString,
	profile: optionalString,
	type: optionalString,
	apple_id: optionalString,
	method_type: optionalString,
});

export const loginCommonBodySchema = z.object({
	uniqueId: z.string().min(1, "The Email/Phone field is required"),
	checkUnique: optionalTruthy,
	methodType: optionalString,
	token: optionalString,
});

export const verifyCommonOtpBodySchema = z.object({
	uniqueId: z.string().min(1),
	otp: z.string().min(1, "OTP field is required."),
	device_id: optionalString,
	login: optionalTruthy,
});

export const employeeRegisterBodySchema = z.object({
	fname: z.string().min(1, "First Name field is required"),
	lname: optionalString,
	email: z.string().email("Email field is required"),
	phone: z.string().min(10).max(15),
	gender: optionalString,
	country: optionalString,
	work_status: optionalString,
	method_type: optionalString,
	referral_code: optionalString,
	register_type: optionalString,
	pan: optionalString,
});

export const companyRegisterBodySchema = z.object({
	company_name: z.string().min(1, "Company Name field is required"),
	email: z.string().email("Email field is required"),
	phone: z.string().min(10).max(15),
	contact_person: optionalString,
	company_size: optionalString,
	country: optionalString,
	method_type: optionalString,
	referral_code: optionalString,
	invite: optionalString,
});

export const employeeSignupBodySchema = z.object({
	fname: z.string().min(1, "First Name field is required"),
	lname: optionalString,
	email: z.string().email("Email field is required"),
	phone: z.string().min(10).max(15),
	country: optionalString,
	state: optionalString,
	city: optionalString,
	dob: optionalString,
	gender: optionalString,
	work_status: optionalString,
	method_type: optionalString,
	referral_code: optionalString,
	company_id: optionalString,
	phone_verified: optionalString,
	email_verified: optionalString,
});

export const finalSignupBodySchema = z.object({
	user_id: z.coerce.number().int().positive("user id is missing!"),
	user_token: optionalString,
	user_register_type: optionalString,
	on_explore: optionalString,
	on_immediate: optionalString,
	on_notice: optionalString,
	notice_period: optionalString,
	notice_date: optionalString,
	exploring_option: z.any().optional(),
	current_position: optionalString,
	current_company: optionalString,
	joining_date: optionalString,
	worked_till_date: optionalString,
	still_working: optionalString,
	// education (type 1)
	university: optionalString,
	course_type: optionalString,
	course: optionalString,
	starting_date: optionalString,
	ending_date: optionalString,
	state: optionalString,
	city: optionalString,
	country: optionalString,
	ishighest: optionalString,
	ongoing: optionalString,
	// company onboarding
	company_name: optionalString,
	contact_person: optionalString,
	company_email: optionalString,
	company_phone: optionalString,
	incorporate_date: optionalString,
	website: optionalString,
	industry: optionalString,
	// job optional
	job_title: optionalString,
	job_description: optionalString,
	roles_responsibility: optionalString,
	department: optionalString,
	role_type: optionalString,
	salary: optionalString,
	vacancy: optionalString,
	urgent: optionalString,
	experience: optionalString,
	designation: optionalString,
	status: optionalString,
	job_mode: optionalString,
	skill: z.any().optional(),
	slug: optionalString,
});

export const uploadResumeBodySchema = z.object({
	user_id: z.coerce.number().int().positive("User ID is required"),
});

export const sendOtpSchema = z.object({ body: sendOtpBodySchema });
export const verifyOtpSchema = z.object({ body: verifyOtpBodySchema });
export const socialLoginSchema = z.object({ body: socialLoginBodySchema });
export const loginCommonSchema = z.object({ body: loginCommonBodySchema });
export const verifyCommonOtpSchema = z.object({ body: verifyCommonOtpBodySchema });
export const employeeRegisterSchema = z.object({ body: employeeRegisterBodySchema });
export const companyRegisterSchema = z.object({ body: companyRegisterBodySchema });
export const employeeSignupSchema = z.object({ body: employeeSignupBodySchema });
export const finalSignupSchema = z.object({ body: finalSignupBodySchema });
export const uploadResumeSchema = z.object({ body: uploadResumeBodySchema });

export type SendOtpBody = z.infer<typeof sendOtpBodySchema>;
export type VerifyOtpBody = z.infer<typeof verifyOtpBodySchema>;
export type SocialLoginBody = z.infer<typeof socialLoginBodySchema>;
export type LoginCommonBody = z.infer<typeof loginCommonBodySchema>;
export type VerifyCommonOtpBody = z.infer<typeof verifyCommonOtpBodySchema>;
export type EmployeeRegisterBody = z.infer<typeof employeeRegisterBodySchema>;
export type CompanyRegisterBody = z.infer<typeof companyRegisterBodySchema>;
export type EmployeeSignupBody = z.infer<typeof employeeSignupBodySchema>;
export type FinalSignupBody = z.infer<typeof finalSignupBodySchema>;
export type UploadResumeBody = z.infer<typeof uploadResumeBodySchema>;
