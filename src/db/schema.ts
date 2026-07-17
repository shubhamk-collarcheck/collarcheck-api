import { mysqlTable, mysqlSchema, tinyint, bigint, AnyMySqlColumn, int, varchar, text, index, longtext, datetime, date, time, timestamp, unique, mysqlEnum, char, float } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const cybAccomodation = mysqlTable("cyb_accomodation", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 100 }),
	modifyDate: varchar("modify_date", { length: 100 }),
});

export const cybAccountDeleteRequests = mysqlTable("cyb_account_delete_requests", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	optionId: int("option_id").notNull(),
	message: text(),
	expiry: varchar({ length: 250 }),
	createDate: varchar("create_date", { length: 250 }),
	status: int().default(1),
	isDeleted: int("is_deleted").default(0).notNull(),
});

export const cybAccountSetting = mysqlTable("cyb_account_setting", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	code: varchar({ length: 250 }),
	key: varchar({ length: 250 }),
	value: varchar({ length: 250 }),
	status: int().default(1).notNull(),
},
	(table) => [
		index("idx_user_id").on(table.userId),
	]);

export const cybAdmin = mysqlTable("cyb_admin", {
	id: int().autoincrement().primaryKey().notNull(),
	username: varchar({ length: 100 }).notNull(),
	permission: longtext(),
	firstname: varchar({ length: 250 }),
	lastname: varchar({ length: 100 }),
	email: varchar({ length: 250 }),
	individualId: varchar("individual_id", { length: 50 }),
	password: varchar({ length: 250 }).notNull(),
	userGroupId: int("user_group_id"),
	photo: varchar({ length: 250 }),
	isSuper: int("is_super").default(0).notNull(),
	status: int().default(1).notNull(),
	lastLogin: varchar("last_login", { length: 250 }),
	createdBy: int("created_by"),
	createDate: varchar("create_date", { length: 250 }).notNull(),
	modifyDate: varchar("modify_date", { length: 250 }).notNull(),
});

export const cybAdminGroup = mysqlTable("cyb_admin_group", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	permission: text(),
	rights: text(),
	widgets: text(),
	masking: int(),
	isSuper: int("is_super").default(0).notNull(),
	status: int().default(1).notNull(),
	createdBy: int("created_by"),
	createDate: varchar("create_date", { length: 100 }),
	modifyDate: varchar("modify_date", { length: 100 }),
});

export const cybAdminPermission = mysqlTable("cyb_admin_permission", {
	id: int().autoincrement().primaryKey().notNull(),
	userGroup: int("user_group"),
	menu: int(),
	permission: longtext(),
});

export const cybApplication = mysqlTable("cyb_application", {
	id: int().autoincrement().primaryKey().notNull(),
	job: int(),
	user: int(),
	status: int().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybAuthor = mysqlTable("cyb_author", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 150 }).notNull(),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybBenefits = mysqlTable("cyb_benefits", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	image: varchar({ length: 250 }),
	description: text(),
	status: int().default(1).notNull(),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybBlog = mysqlTable("cyb_blog", {
	id: int().autoincrement().primaryKey().notNull(),
	title: text(),
	image: text(),
	thumbnailImage: text("thumbnail_image"),
	description: text(),
	shortDescription: text("short_description"),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	publishDate: date("publish_date", { mode: 'string' }),
	readingTime: time("reading_time"),
	authorId: varchar("author_id", { length: 100 }),
	categoryId: int("category_id").notNull(),
	slug: text(),
	sortOrder: int("sort_order"),
	metaTitle: text("meta_title"),
	metaKeyword: text("meta_keyword"),
	metaDescription: text("meta_description"),
	h1Tag: varchar("h1_tag", { length: 255 }),
	footerDescription: text("footer_description"),
	metaRobots: varchar("meta_robots", { length: 100 }),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybBranches = mysqlTable("cyb_branches", {
	id: int().autoincrement().primaryKey().notNull(),
	name: int(),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybCareerEnquiries = mysqlTable("cyb_career_enquiries", {
	id: int().autoincrement().primaryKey().notNull(),
	firstName: varchar({ length: 100 }).notNull(),
	lastName: varchar({ length: 100 }),
	email: varchar({ length: 100 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	message: text(),
	company: varchar({ length: 250 }),
	createDate: varchar("create_date", { length: 100 }),
});

export const cybCategories = mysqlTable("cyb_categories", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybChatSupport = mysqlTable("cyb_chat_support", {
	id: int().autoincrement().primaryKey().notNull(),
	type: varchar({ length: 50 }).notNull(),
	question: text().notNull(),
	answer: text().notNull(),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCities = mysqlTable("cyb_cities", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	state: int().default(0),
	userDifined: int("user_difined").default(0),
	userId: int("user_id").default(0),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
	status: int().default(0),
},
	(table) => [
		index("cities_index").on(table.state, table.status),
	]);

export const cybClearNotification = mysqlTable("cyb_clear_notification", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	notificationId: int("notification_id").notNull(),
	clearedAt: datetime("cleared_at", { mode: 'string' }),
});

export const cybClaimCompanyEnquires = mysqlTable("cyb_claim_company_enquires", {
	id: int().autoincrement().primaryKey().notNull(),
	contactPerson: varchar("contact_person", { length: 80 }).notNull(),
	company: int().notNull(),
	email: varchar({ length: 50 }),
	phone: varchar({ length: 15 }),
	website: varchar({ length: 250 }),
	message: text(),
	createDate: varchar("create_date", { length: 100 }),
});

export const cybClarity = mysqlTable("cyb_clarity", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	result: longtext(),
	createDate: varchar("create_date", { length: 100 }),
	modifyDate: varchar("modify_date", { length: 100 }),
});

export const cybCompanyBenefits = mysqlTable("cyb_company_benefits", {
	id: int().autoincrement().primaryKey().notNull(),
	companyId: int("company_id").notNull(),
	benefitId: int("benefit_id").notNull(),
	description: text(),
	status: int().default(1).notNull(),
	sortOrder: int(),
	isDeleted: int("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("company_benefits_index").on(table.companyId, table.benefitId, table.status, table.isDeleted),
	]);

export const cybCompanyBranches = mysqlTable("cyb_company_branches", {
	id: int().autoincrement().primaryKey().notNull(),
	branchId: int("branch_id"),
	companyId: int("company_id"),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCompanyConnection = mysqlTable("cyb_company_connection", {
	id: int().autoincrement().primaryKey().notNull(),
	company: int(),
	user: int(),
	currentEmployee: int("current_employee").default(0),
	status: int().default(1),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCompanyDocument = mysqlTable("cyb_company_document", {
	id: int().autoincrement().primaryKey().notNull(),
	company: int(),
	doctype: varchar({ length: 50 }),
	docName: text("doc_name"),
	docnumber: text(),
	status: int().default(0).notNull(),
	verify: int().default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCompanyInvite = mysqlTable("cyb_company_invite", {
	id: int().autoincrement().primaryKey().notNull(),
	fname: varchar({ length: 250 }),
	lname: varchar({ length: 100 }),
	phone: varchar({ length: 50 }),
	email: varchar({ length: 250 }),
	profile: varchar({ length: 250 }),
	contactPerson: varchar("contact_person", { length: 250 }),
	website: varchar({ length: 250 }),
	company: int().notNull(),
	addedBy: int("added_by").notNull(),
	incorporateDate: varchar("incorporate_date", { length: 250 }),
	status: int().default(1).notNull(),
	isDeleted: int("is_deleted").default(0),
	industry: int(),
	claimStatus: int("claim_status").default(0),
	modifyDate: varchar("modify_date", { length: 50 }),
	createDate: varchar("create_date", { length: 100 }),
});

export const cybCompanyJob = mysqlTable("cyb_company_job", {
	id: int().autoincrement().primaryKey().notNull(),
	company: int(),
	jobTitle: text("job_title"),
	jobDescription: text("job_description"),
	slug: text(),
	rolesResponsibility: text("roles_responsibility"),
	department: int(),
	experience: text(),
	skill: text(),
	roleType: int("role_type"),
	document: text(),
	location: int(),
	country: int(),
	state: int(),
	jobMode: int("job_mode"),
	tag: text(),
	city: int(),
	industry: int(),
	designation: int(),
	urgent: tinyint(),
	vacancy: int(),
	postedDate: datetime("posted_date", { mode: 'string' }),
	closingDate: datetime("closing_date", { mode: 'string' }),
	salary: int(),
	status: int().default(1),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("jobs_index").on(table.company, table.department, table.country, table.state, table.city, table.industry, table.designation, table.vacancy, table.status, table.isDeleted, table.jobTitle, table.createDate),
	]);

export const cybCompanySize = mysqlTable("cyb_company_size", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybCompanyWishlist = mysqlTable("cyb_company_wishlist", {
	id: int().autoincrement().primaryKey().notNull(),
	company: int(),
	user: int(),
	status: int().default(1),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCountry = mysqlTable("cyb_country", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 36 }),
	sortname: varchar({ length: 3 }),
	iso2: varchar({ length: 2 }),
	phonecode: int(),
	status: int(),
});

export const cybCourses = mysqlTable("cyb_courses", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text().notNull(),
	image: varchar({ length: 250 }),
	status: int().default(1).notNull(),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("courses_index").on(table.status),
	]);

export const cybCourseType = mysqlTable("cyb_course_type", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCrmCall = mysqlTable("cyb_crm_call", {
	id: int().autoincrement().primaryKey().notNull(),
	callccid: varchar({ length: 150 }).notNull(),
	userId: int("user_id"),
	callDuration: varchar("call_duration", { length: 10 }),
	callStatus: int("call_status"),
	followUpType: int("follow_up_type"),
	followUp: int("follow_up"),
	initialPercentage: int("initial_percentage"),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	nextFollowDate: date("next_follow_date", { mode: 'string' }),
	updatePercentage: int("update_percentage"),
	callOutcome: int("call_outcome"),
	remark: text(),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybCustomerVisits = mysqlTable("cyb_customer_visits", {
	id: int().autoincrement().primaryKey().notNull(),
	restaurantId: int("restaurant_id"),
	customerId: varchar("customer_id", { length: 150 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	visitDate: date("visit_date", { mode: 'string' }),
	groupSize: int("group_size"),
	billBeforeAmount: varchar("bill_before_amount", { length: 10 }),
	discount: varchar({ length: 10 }),
	billAfterAmount: varchar("bill_after_amount", { length: 10 }),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: timestamp("create_date", { mode: 'string' }),
	modifyDate: timestamp("modify_date", { mode: 'string' }),
});

export const cybDeleteOptions = mysqlTable("cyb_delete_options", {
	id: int().autoincrement().primaryKey().notNull(),
	title: varchar({ length: 250 }),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
	status: int().default(1),
	isDeleted: int("is_deleted").default(0).notNull(),
});

export const cybDepartment = mysqlTable("cyb_department", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("department_index").on(table.status),
	]);

export const cybDesignation = mysqlTable("cyb_designation", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	status: int().default(1).notNull(),
	userId: int("user_id"),
	userDefined: int("user_defined"),
	slug: text(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("department_index").on(table.status),
	]);

export const cybDoctype = mysqlTable("cyb_doctype", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }),
	status: int().default(1).notNull(),
	docfor: int().default(0).notNull(),
	isVerificationRequired: int("is_verification_required").default(0),
	isTextbox: int("is_textbox").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybEmailBlacklist = mysqlTable("cyb_email_blacklist", {
	id: int().autoincrement().primaryKey().notNull(),
	email: varchar({ length: 100 }).notNull(),
	reason: text(),
	source: text(),
	errorMsg: text("error_msg"),
	createDate: datetime("create_date", { mode: 'string' }),
},
	(table) => [
		index("skill_index").on(table.email),
	]);

export const cybEmailTemplates = mysqlTable("cyb_email_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	short: varchar({ length: 11 }),
	status: int(),
	type: tinyint(),
	subject: text(),
	templatePath: varchar("template_path", { length: 250 }),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybEmployementType = mysqlTable("cyb_employement_type", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybEnquiries = mysqlTable("cyb_enquiries", {
	id: int().autoincrement().primaryKey().notNull(),
	firstName: varchar({ length: 100 }).notNull(),
	lastName: varchar({ length: 100 }),
	email: varchar({ length: 100 }).notNull(),
	phone: varchar({ length: 30 }).notNull(),
	message: text(),
	company: varchar({ length: 250 }),
	createDate: varchar("create_date", { length: 100 }),
});

export const cybEventMenu = mysqlTable("cyb_event_menu", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 150 }).notNull(),
	description: varchar({ length: 255 }),
	menuId: int("menu_id"),
	status: tinyint().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybFaqs = mysqlTable("cyb_faqs", {
	id: int().autoincrement().primaryKey().notNull(),
	question: varchar({ length: 255 }),
	answer: text(),
	shortedOrder: int("shorted_order").default(1),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybFollow = mysqlTable("cyb_follow", {
	id: int().autoincrement().primaryKey().notNull(),
	followedId: int("followed_id").notNull(),
	followerId: int("follower_id").notNull(),
	status: int().default(0).notNull(),
	isDeleted: int("is_deleted").default(0),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybFrontMenu = mysqlTable("cyb_front_menu", {
	id: int().autoincrement().primaryKey().notNull(),
	parentId: int("parent_id"),
	title: varchar({ length: 255 }),
	name: varchar({ length: 250 }),
	description: text(),
	image: varchar({ length: 100 }),
	position: int(),
	subTitle: text(),
	header: int(),
	footer: int(),
	link: varchar({ length: 250 }),
	sortOrder: int("sort_order"),
	metaTitle: varchar({ length: 250 }),
	metaKeyword: varchar({ length: 250 }),
	title1: text(),
	description1: text(),
	title2: text(),
	description2: text(),
	additionalImage: varchar({ length: 200 }),
	metaDescription: text(),
	sortOrderFooter: int("sort_order_footer"),
	status: int(),
	createDate: varchar("create_date", { length: 100 }),
	modifyDate: varchar("modify_date", { length: 100 }),
});

export const cybGalleries = mysqlTable("cyb_galleries", {
	id: int().autoincrement().primaryKey().notNull(),
	companyId: int("company_id").notNull(),
	name: text(),
	image: varchar({ length: 250 }),
	description: text(),
	status: int().default(1).notNull(),
	isDeleted: int("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybGender = mysqlTable("cyb_gender", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 20 }).notNull(),
	status: int().default(1).notNull(),
	createDate: varchar("create_date", { length: 20 }),
});

export const cybHelp = mysqlTable("cyb_help", {
	id: int().primaryKey().notNull(),
	experience: int(),
	subject: text(),
	message: text(),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybIndustries = mysqlTable("cyb_industries", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int().default(1),
	isDeleted: int("is_deleted").default(0).notNull(),
	userId: int("user_id"),
	userDefined: int("user_defined"),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
},
	(table) => [
		index("industry_index").on(table.status, table.isDeleted),
	]);

export const cybInstitutions = mysqlTable("cyb_institutions", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	image: varchar({ length: 250 }),
	userDefined: int("user_defined"),
	status: int().default(1).notNull(),
	userId: int("user_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybJobCollaborators = mysqlTable("cyb_job_collaborators", {
	id: int().autoincrement().primaryKey().notNull(),
	companyId: int("company_id"),
	userId: text("user_id"),
	jobId: int("job_id"),
	role: mysqlEnum(['admin', 'manager', 'recruiter', 'viewer']),
	status: int().default(1),
	invitedBy: int("invited_by"),
	createdAt: datetime("created_at", { mode: 'string' }),
	updatedAt: datetime("updated_at", { mode: 'string' }),
	isDeleted: int("is_deleted").default(0).notNull(),
},
	(table) => [
		unique("uniq_company_user").on(table.companyId, table.userId, table.jobId),
	]);

export const cybJobCollaboratorLogs = mysqlTable("cyb_job_collaborator_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	companyId: int("company_id"),
	userId: int("user_id"),
	module: varchar({ length: 50 }),
	action: varchar({ length: 100 }),
	createdAt: datetime("created_at", { mode: 'string' }),
});

export const cybJobExperiences = mysqlTable("cyb_job_experiences", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybJobMeta = mysqlTable("cyb_job_meta", {
	id: int().autoincrement().primaryKey().notNull(),
	metaTitle: varchar("meta_title", { length: 255 }),
	metaDescription: varchar("meta_description", { length: 255 }),
	metaKeyword: varchar("meta_keyword", { length: 255 }),
	jobSlug: varchar("job_slug", { length: 255 }),
	h1Tag: varchar("h1_tag", { length: 255 }),
	footerDescription: text("footer_description"),
	metaRobot: varchar("meta_robot", { length: 100 }),
	jobId: varchar("job_id", { length: 255 }),
	countryId: text("country_id"),
	stateId: text("state_id"),
	cityId: text("city_id"),
	designationId: text("designation_id"),
	departmentId: text("department_id"),
	ogImage: varchar("og_image", { length: 255 }),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybJobMode = mysqlTable("cyb_job_mode", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int().default(1),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybJobTemplate = mysqlTable("cyb_job_template", {
	id: int().autoincrement().primaryKey().notNull(),
	company: int(),
	jobTitle: text("job_title"),
	templateName: varchar("template_name", { length: 50 }),
	jobDescription: text("job_description"),
	slug: text(),
	rolesResponsibility: text("roles_responsibility"),
	department: int(),
	experience: text(),
	skill: text(),
	roleType: int("role_type"),
	document: text(),
	location: int(),
	country: int(),
	state: int(),
	jobMode: int("job_mode"),
	tag: text(),
	city: int(),
	industry: int(),
	designation: int(),
	urgent: tinyint(),
	vacancy: int(),
	postedDate: datetime("posted_date", { mode: 'string' }),
	closingDate: datetime("closing_date", { mode: 'string' }),
	salary: int(),
	status: int().default(1),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("jobs_index").on(table.company, table.department, table.country, table.state, table.city, table.industry, table.designation, table.vacancy, table.status),
	]);

export const cybLanguages = mysqlTable("cyb_languages", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int().notNull(),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybLogs = mysqlTable("cyb_logs", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	type: varchar({ length: 50 }),
	callMethod: varchar("call_method", { length: 100 }),
	logMessage: text("log_message"),
	payload: text(),
	statusCode: int("status_code"),
	custumMessage: text("custum_message").notNull(),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
});

export const cybManualDocumentVerify = mysqlTable("cyb_manual_document_verify", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	doctype: int(),
	description: text(),
	docs: text(),
	isDeleted: int("is_deleted").default(0),
	modifyDate: varchar("modify_date", { length: 50 }),
	status: int().default(1).notNull(),
	createDate: varchar("create_date", { length: 250 }),
},
	(table) => [
		index("user_index").on(table.userId),
	]);

export const cybMenu = mysqlTable("cyb_menu", {
	id: int().autoincrement().primaryKey().notNull(),
	parentId: int("parent_id"),
	name: varchar({ length: 250 }),
	fafa: varchar({ length: 250 }),
	link: varchar({ length: 250 }),
	sortOrder: int("sort_order"),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybMergeCompany = mysqlTable("cyb_merge_company", {
	id: int().autoincrement().primaryKey().notNull(),
	mergeCompany: int("merge_company"),
	mainCompany: int("main_company"),
	status: tinyint().default(1),
	isDeleted: tinyint("is_deleted"),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybMergeCompanyRequest = mysqlTable("cyb_merge_company_request", {
	id: int().autoincrement().primaryKey().notNull(),
	requestFrom: int("request_from").notNull(),
	requestTo: int("request_to").notNull(),
	status: tinyint(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybMessage = mysqlTable("cyb_message", {
	id: int().autoincrement().primaryKey().notNull(),
	sender: int().notNull(),
	receiver: int().notNull(),
	forApproval: int("for_approval").default(1).notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybMessageHistory = mysqlTable("cyb_message_history", {
	id: int().autoincrement().primaryKey().notNull(),
	messageId: int("message_id").default(0),
	sender: int().notNull(),
	receiver: int().notNull(),
	message: text(),
	doc: text(),
	isViewed: int("is_viewed").default(0).notNull(),
	forApproval: int("for_approval").default(1).notNull(),
	viewDatetime: varchar("view_datetime", { length: 250 }),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybMigrations = mysqlTable("cyb_migrations", {
	id: bigint({ mode: "number" }).autoincrement().primaryKey().notNull(),
	version: varchar({ length: 255 }).notNull(),
	class: varchar({ length: 255 }).notNull(),
	group: varchar({ length: 255 }).notNull(),
	namespace: varchar({ length: 255 }).notNull(),
	time: int().notNull(),
	batch: int().notNull(),
});

export const cybMonth = mysqlTable("cyb_month", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	monthNumber: int("month_number"),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybNoticePeriod = mysqlTable("cyb_notice_period", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	type: char({ length: 10 }),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybNotifications = mysqlTable("cyb_notifications", {
	id: int().autoincrement().primaryKey().notNull(),
	sender: int().notNull(),
	receiver: int().notNull(),
	message: text(),
	doc: text(),
	type: varchar({ length: 20 }),
	link: text(),
	redirect: varchar({ length: 50 }),
	isViewed: int("is_viewed").default(0).notNull(),
	slug: varchar({ length: 50 }),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybOtp = mysqlTable("cyb_otp", {
	id: int().autoincrement().primaryKey().notNull(),
	phone: varchar({ length: 20 }).notNull(),
	email: varchar({ length: 250 }),
	otp: varchar({ length: 10 }).notNull(),
	type: mysqlEnum(['LOGIN', 'SIGNUP', 'VERIFICATION']),
	isDeleted: int("is_deleted").default(0),
	expiry: varchar({ length: 11 }).notNull(),
	status: int().default(1).notNull(),
	createDate: varchar("create_date", { length: 100 }),
},
	(table) => [
		index("otp_index").on(table.phone, table.email, table.otp, table.isDeleted),
	]);

export const cybPermission = mysqlTable("cyb_permission", {
	id: int().autoincrement().primaryKey().notNull(),
	permissionName: text("permission_name").notNull(),
	permissionKey: text("permission_key"),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
});

export const cybPortfolioDocumentType = mysqlTable("cyb_portfolio_document_type", {
	id: int().autoincrement().primaryKey().notNull(),
	type: text(),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybRamdomWidgets = mysqlTable("cyb_ramdom_widgets", {
	id: int().autoincrement().primaryKey().notNull(),
	heading: text().notNull(),
	status: int(),
	variant: varchar({ length: 250 }),
	widget: varchar({ length: 20 }),
	type: varchar({ length: 50 }),
	api: varchar({ length: 50 }),
	minLimit: int("min_limit"),
	slug: varchar({ length: 250 }),
	apiSlug: varchar("api_slug", { length: 250 }),
});

export const cybRatingWeight = mysqlTable("cyb_rating_weight", {
	id: int().autoincrement().primaryKey().notNull(),
	session: varchar({ length: 100 }),
	weight: varchar({ length: 20 }),
	type: mysqlEnum(['latest', 'previous', 'others', 'session_avg', 'progressive', 'criteria_lifetime', 'unique_criteria']),
	weightType: tinyint("weight_type"),
	status: tinyint().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybReels = mysqlTable("cyb_reels", {
	id: int().autoincrement().primaryKey().notNull(),
	title: text(),
	thumbnailImage: text("thumbnail_image"),
	video: varchar({ length: 255 }),
	videoLink: varchar("video_link", { length: 255 }),
	slug: text(),
	sortOrder: int("sort_order"),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybReportReviews = mysqlTable("cyb_report_reviews", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	reviewId: int("review_id").notNull(),
	message: text(),
	createDate: varchar("create_date", { length: 250 }),
	status: int().default(1),
	isDeleted: int("is_deleted").default(0).notNull(),
});

export const cybRestaurants = mysqlTable("cyb_restaurants", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 20 }),
	password: varchar({ length: 255 }),
	token: text(),
	profile: text(),
	address: text(),
	googleMap: text("google_map"),
	discount: varchar({ length: 50 }),
	banner: text(),
	shortDescription: text(),
	category: int(),
	status: tinyint().default(1),
	isDeleted: tinyint("is_deleted").default(0),
	createDate: timestamp("create_date", { mode: 'string' }),
	modifyDate: timestamp("modify_date", { mode: 'string' }),
},
	(table) => [
		index("restaurant_index").on(table.phone, table.isDeleted, table.status),
		unique("email").on(table.email),
	]);

export const cybRestaurantCategory = mysqlTable("cyb_restaurant_category", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }),
	status: tinyint().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: timestamp("create_date", { mode: 'string' }).notNull(),
	modifyDate: timestamp("modify_date", { mode: 'string' }).notNull(),
});

export const cybRestaurantCustomers = mysqlTable("cyb_restaurant_customers", {
	id: int().autoincrement().primaryKey().notNull(),
	restaurantId: int("restaurant_id"),
	customerId: varchar("customer_id", { length: 150 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	firstVisitDate: date("first_visit_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	lastVisitDate: date("last_visit_date", { mode: 'string' }),
	totalVisits: int("total_visits"),
	isDeleted: tinyint("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybResumeDownload = mysqlTable("cyb_resume_download", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id"),
	templeteId: int("templete_id"),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybResumeTemplates = mysqlTable("cyb_resume_templates", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	thumbnail: varchar({ length: 100 }),
	status: int(),
	short: int(),
	type: tinyint().notNull(),
	templatePath: varchar("template_path", { length: 250 }),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybRoleTypes = mysqlTable("cyb_role_types", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybSalary = mysqlTable("cyb_salary", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybSchedulars = mysqlTable("cyb_schedulars", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }),
	emails: longtext(),
	inactiveEmails: longtext("inactive_emails"),
	template: int(),
	trigger: datetime({ mode: 'string' }),
	delivered: longtext(),
	notDelivered: longtext("not_delivered"),
	notSend: longtext("not_send"),
	status: int().default(0).notNull(),
	execute: tinyint().default(0).notNull(),
	type: varchar({ length: 150 }),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
	sentTime: datetime("sent_time", { mode: 'string' }),
});

export const cybSchedularEmailTemp = mysqlTable("cyb_schedular_email_temp", {
	id: int().autoincrement().primaryKey().notNull(),
	schedularId: int("schedular_id"),
	email: varchar({ length: 250 }),
	status: int().default(0).notNull(),
	deliver: int().default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybSchedularHistory = mysqlTable("cyb_schedular_history", {
	id: int().autoincrement().primaryKey().notNull(),
	schedularId: int("schedular_id"),
	email: varchar({ length: 250 }),
	template: int(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("idx_email_template").on(table.email, table.template),
	]);

export const cybSetting = mysqlTable("cyb_setting", {
	id: int().autoincrement().primaryKey().notNull(),
	code: varchar({ length: 50 }),
	key: varchar({ length: 50 }),
	value: varchar({ length: 250 }),
	name: text(),
	detail: text(),
	status: int().default(1).notNull(),
});

export const cybSkill = mysqlTable("cyb_skill", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	status: int().default(1).notNull(),
	userId: int("user_id"),
	userDefined: int("user_defined"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("skill_index").on(table.status),
	]);

export const cybSkillRating = mysqlTable("cyb_skill_rating", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	reviewId: int("review_id"),
	experienceId: int("experience_id"),
	skillId: int("skill_id").notNull(),
	rating: int().default(0).notNull(),
	showHome: tinyint("show_home").default(0).notNull(),
	status: int().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("skill_rating_index").on(table.reviewId, table.showHome, table.skillId, table.userId, table.isDeleted),
	]);

export const cybSkillRatingHistory = mysqlTable("cyb_skill_rating_history", {
	id: int().autoincrement().primaryKey().notNull(),
	reviewHistoryId: int("review_history_id"),
	skillId: int("skill_id").notNull(),
	rating: int().default(0).notNull(),
	status: int().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("skill_rating_index").on(table.skillId),
	]);

export const cybState = mysqlTable("cyb_state", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 56 }),
	country: int(),
	code: varchar({ length: 5 }),
	status: int(),
	slug: text(),
},
	(table) => [
		index("state_index").on(table.id, table.country, table.status),
	]);

export const cybSuggestion = mysqlTable("cyb_suggestion", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 500 }),
	phone: bigint({ mode: "number" }),
	description: text(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybTag = mysqlTable("cyb_tag", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 150 }),
	status: tinyint().default(1),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybTrackEmails = mysqlTable("cyb_track_emails", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	templateId: int("template_id").notNull(),
	schedularId: int("schedular_id"),
	createDate: datetime("create_date", { mode: 'string' }),
});

export const cybTriggerEmail = mysqlTable("cyb_trigger_email", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int().notNull(),
	email: varchar({ length: 100 }).notNull(),
	template: int().notNull(),
	status: tinyint().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybTurnover = mysqlTable("cyb_turnover", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }).notNull(),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybUser = mysqlTable("cyb_user", {
	id: int().autoincrement().primaryKey(),
	individualId: varchar("individual_id", { length: 11 }),
	userType: int("user_type").default(1),
	fname: varchar({ length: 60 }),
	lname: varchar({ length: 40 }),
	fullName: varchar("full_name", { length: 255 }).generatedAlwaysAs(sql`concat_ws(' ',\`fname\`,\`lname\`)`, { mode: "stored" }),
	email: varchar({ length: 80 }),
	phone: varchar({ length: 20 }),
	slug: varchar({ length: 250 }),
	token: text(),
	phoneVerified: int("phone_verified"),
	emailVerified: int("email_verified"),
	gender: tinyint(),
	secondPhoneVerify: int("second_phone_verify"),
	emailAlternateVerify: int("email_alternate_verify"),
	emailAlternate: varchar("email_alternate", { length: 250 }),
	secondPhone: varchar("second_phone", { length: 15 }),
	socialImage: text("social_image"),
	profile: text(),
	password: text(),
	city: int(),
	state: int(),
	accomodation: int(),
	presentAddress: text("present_address"),
	permanentAddress: text("permanent_address"),
	sameAddress: tinyint("same_address"),
	country: int(),
	dob: varchar({ length: 100 }),
	displayType: int("display_type").default(0),
	workStatus: int("work_status"),
	currentPossition: int("current_possition"),
	currentCompany: int("current_company"),
	userDefinedCompany: int("user_defined_company"),
	claimStatus: int("claim_status").default(0),
	profileDescription: text("profile_description"),
	linkdin: text(),
	youtube: text(),
	instagram: text(),
	facebook: text(),
	twitter: text(),
	contactPerson: varchar("contact_person", { length: 250 }),
	website: text(),
	industry: int(),
	incorporateDate: varchar("incorporate_date", { length: 50 }),
	noOfEmployee: int("no_of_employee"),
	turnover: int(),
	companySize: int("company_size"),
	expectedSalary: int("expected_salary"),
	expectedInhand: varchar("expected_inhand", { length: 50 }),
	expectedMode: varchar("expected_mode", { length: 50 }),
	noticePeriod: int("notice_period"),
	onNotice: tinyint("on_notice"),
	onImmediate: tinyint("on_immediate"),
	onExplore: tinyint("on_explore").default(0).notNull(),
	noticeDate: varchar("notice_date", { length: 250 }),
	resume: varchar({ length: 250 }),
	resumeName: text(),
	loginTime: datetime("login_time", { mode: 'string' }),
	registerType: varchar("register_type", { length: 50 }),
	isOnline: int("is_online"),
	referralCode: varchar("referral_code", { length: 50 }),
	status: int().default(1).notNull(),
	appleId: varchar("apple_id", { length: 50 }),
	acceptTerm: tinyint("accept_term").default(1).notNull(),
	createdBy: int("created_by"),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	userRegisterType: tinyint("user_register_type"),
	methodType: varchar("method_type", { length: 20 }),
	percentage: int(),
	percentageStatus: int("percentage_status").default(0).notNull(),
	cvPop: int(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
	randomValue: float("random_value"),
},
	(table) => [
		index("user_index").on(table.state, table.city, table.currentCompany, table.currentPossition, table.country, table.incorporateDate, table.industry, table.fname),
		index("user_index_new").on(table.id, table.userType, table.status, table.onNotice, table.onImmediate, table.onExplore, table.isDeleted, table.percentage),
		index("idx_slug_status_deleted").on(table.slug, table.status, table.isDeleted),
		index("idx_usertype_status_deleted").on(table.userType, table.status, table.isDeleted),
		index("idx_company_filter").on(table.userType, table.claimStatus, table.status, table.isDeleted),
		index("idx_user_deleted").on(table.id, table.isDeleted),
	]);

export const cybUserCertificate = mysqlTable("cyb_user_certificate", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	university: text(),
	course: text(),
	startDate: varchar("start_date", { length: 250 }),
	endDate: varchar("end_date", { length: 250 }),
	ongoing: tinyint(),
	certificate: text(),
	certificateId: varchar("certificate_id", { length: 50 }),
	url: text(),
	status: int().default(1).notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createdBy: int("created_by"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserContacts = mysqlTable("cyb_user_contacts", {
	id: bigint({ mode: "number" }).autoincrement().primaryKey().notNull(),
	userId: bigint("user_id", { mode: "number" }).notNull(),
	mobile: varchar({ length: 20 }).notNull(),
	contactName: varchar("contact_name", { length: 255 }),
	contactHash: varchar("contact_hash", { length: 64 }),
	lastSyncedAt: datetime("last_synced_at", { mode: 'string' }),
	createdAt: datetime("created_at", { mode: 'string' }),
	updatedAt: datetime("updated_at", { mode: 'string' }),
},
	(table) => [
		unique("unique_user_mobile").on(table.userId, table.mobile),
	]);

export const cybUserDetails = mysqlTable("cyb_user_details", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	noticeEmployments: text("notice_employments"),
	latitude: varchar({ length: 50 }),
	longitude: varchar({ length: 50 }),
	landline: varchar({ length: 20 }),
	exploringOption: text("exploring_option"),
	exploringDetails: text("exploring_details"),
	domain: varchar({ length: 255 }),
	isVerified: tinyint("is_verified").default(0),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	domainCreatedAt: timestamp("domain_created_at", { mode: 'string' }),
	import: tinyint().default(0).notNull(),
},
	(table) => [
		index("user_id").on(table.userId),
	]);

export const cybUserDeviceTokens = mysqlTable("cyb_user_device_tokens", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id"),
	deviceType: varchar("device_type", { length: 20 }),
	deviceId: varchar("device_id", { length: 50 }),
	deviceToken: text("device_token"),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
	status: int().default(1),
	createdAt: datetime("created_at", { mode: 'string' }),
},
	(table) => [
		unique("user_id").on(table.userId, table.deviceId),
	]);

export const cybUserDocument = mysqlTable("cyb_user_document", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	doctype: int(),
	doc: text(),
	docnumber: text(),
	status: int().default(0).notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserDomains = mysqlTable("cyb_user_domains", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	addedBy: int("added_by"),
	domain: varchar({ length: 255 }),
	isEmailBased: tinyint("is_email_based").default(0),
	email: varchar({ length: 50 }),
	verificationKey: text("verification_key"),
	isVerified: tinyint("is_verified").default(0),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	domainCreatedAt: datetime("domain_created_at", { mode: 'string' }),
	domainModifyAt: datetime("domain_modify_at", { mode: 'string' }).notNull(),
	verificationAttempts: int("verification_attempts").default(0),
	lastVerificationAttempt: timestamp("last_verification_attempt", { mode: 'string' }),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
},
	(table) => [
		index("user_id").on(table.userId),
	]);

export const cybUserEducation = mysqlTable("cyb_user_education", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	university: int(),
	course: int(),
	courseType: int("course_type"),
	state: int(),
	city: int(),
	notApplicable: int("not_applicable").default(0).notNull(),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	startingDate: date("starting_date", { mode: 'string' }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	endingDate: date("ending_date", { mode: 'string' }),
	ongoing: tinyint(),
	country: int(),
	ishighest: tinyint(),
	certificate: text(),
	status: int().default(1).notNull(),
	createdBy: int("created_by"),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("education_index").on(table.user, table.university, table.course, table.courseType, table.state, table.city, table.country, table.ishighest, table.isDeleted, table.status),
	]);

export const cybUserExperience = mysqlTable("cyb_user_experience", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	company: int(),
	employmentType: int("employment_type"),
	designation: int(),
	workEmail: varchar("work_email", { length: 100 }),
	workEmailDate: datetime("work_email_date", { mode: 'string' }),
	salary: varchar({ length: 50 }),
	salaryInhand: varchar("salary_inhand", { length: 250 }),
	salaryMode: varchar("salary_mode", { length: 20 }),
	// you can use { mode: 'date' }, if you want to have Date as type for this column
	joiningDate: date("joining_date", { mode: 'string' }),
	workedTillDate: varchar("worked_till_date", { length: 250 }),
	department: int(),
	stillWorking: int("still_working").default(0).notNull(),
	skill: text(),
	description: text(),
	approved: int().default(0).notNull(),
	lastReview: int(),
	status: int().default(1).notNull(),
	hired: tinyint(),
	state: int(),
	city: int(),
	addedBy: int("added_by").default(0).notNull(),
	createdBy: int("created_by"),
	createDate: varchar("create_date", { length: 100 }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
	expiry: datetime({ mode: 'string' }),
	certificate: text(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
},
	(table) => [
		index("multi index").on(table.user, table.company, table.designation, table.department),
		index("idx_uex_company_filter").on(table.company, table.isDeleted, table.status, table.approved, table.user, table.employmentType, table.designation, table.department, table.hired, table.stillWorking),
	]);

export const cybUserExperienceRating = mysqlTable("cyb_user_experience_rating", {
	id: int().autoincrement().primaryKey().notNull(),
	experience: int(),
	company: int(),
	rating: int().default(0).notNull(),
	review: text(),
	doc: text(),
	link: text(),
	addedBy: int("added_by").default(0).notNull(),
	status: int().default(1).notNull(),
	approved: int().default(0),
	expiry: varchar({ length: 250 }),
	showReview: tinyint("show_review"),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	showHome: tinyint("show_home").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("indx_user_experience_rating").on(table.experience, table.company, table.approved, table.status, table.showHome),
	]);

export const cybUserExperienceRatingHistory = mysqlTable("cyb_user_experience_rating_history", {
	id: int().autoincrement().primaryKey().notNull(),
	ratingId: int("rating_id"),
	rating: int().default(0),
	review: text(),
	doc: text(),
	link: text(),
	isDeleted: int("is_deleted").default(0).notNull(),
	status: int().default(1).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserGroup = mysqlTable("cyb_user_group", {
	id: int().autoincrement().primaryKey().notNull(),
	groupId: int("group_id"),
	menuPermission: text("menu_permission"),
	eventPermission: text("event_permission"),
	status: tinyint().default(1).notNull(),
	addedBy: int("added_by"),
	ownerId: int("owner_id"),
	isDeleted: tinyint("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserLanguage = mysqlTable("cyb_user_language", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	language: int(),
	verbal: int(),
	written: int(),
	status: int().default(1).notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("langauge_index").on(table.user, table.status, table.isDeleted, table.language, table.verbal, table.written),
	]);

export const cybUserLevels = mysqlTable("cyb_user_levels", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int().notNull(),
	level: int(),
	createdAt: datetime("created_at", { mode: 'string' }).notNull(),
	updatedAt: datetime("updated_at", { mode: 'string' }).notNull(),
});

export const cybUserLoginHistory = mysqlTable("cyb_user_login_history", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id").notNull(),
	deviceId: varchar("device_id", { length: 255 }),
	ipAddress: varchar("ip_address", { length: 50 }),
	userAgent: text("user_agent"),
	platform: varchar({ length: 50 }),
	status: tinyint().default(1),
	loginAt: datetime("login_at", { mode: 'string' }),
	logoutAt: datetime("logout_at", { mode: 'string' }),
});

export const cybUserMainGroup = mysqlTable("cyb_user_main_group", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 250 }),
	description: varchar({ length: 255 }),
	status: tinyint().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0),
	companyId: int("company_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserPermission = mysqlTable("cyb_user_permission", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id"),
	groupId: int("group_id"),
	addedBy: int("added_by"),
	parentId: int("parent_id").default(0).notNull(),
	status: tinyint().default(1).notNull(),
	isDeleted: tinyint("is_deleted").default(0),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserProfileViewRequest = mysqlTable("cyb_user_profile_view_request", {
	id: int().autoincrement().primaryKey().notNull(),
	userid: int().notNull(),
	companyid: int().notNull(),
	otp: varchar({ length: 10 }),
	status: int().default(0).notNull(),
	review: int(),
	salary: int(),
	access: text(),
	expiry: varchar({ length: 250 }),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserProtfolio = mysqlTable("cyb_user_protfolio", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	type: int(),
	title: text(),
	description: text(),
	youtube: varchar({ length: 250 }),
	image: text(),
	video: text(),
	pdf: text(),
	url: text(),
	status: int().default(1).notNull(),
	sortOrder: int().default(1),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybUserRelation = mysqlTable("cyb_user_relation", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id"),
	companyId: int("company_id"),
	type: tinyint(),
	permission: text(),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	status: int().default(0).notNull(),
	modifyDate: datetime("modify_date", { mode: 'string' }).notNull(),
});

export const cybUserSkill = mysqlTable("cyb_user_skill", {
	id: int().autoincrement().primaryKey().notNull(),
	user: int(),
	skill: int(),
	rating: int().default(0),
	status: int().default(1).notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("skill_index").on(table.status, table.rating, table.user, table.skill, table.isDeleted),
	]);

export const cybUserUpdateExperience = mysqlTable("cyb_user_update_experience", {
	id: int().autoincrement().primaryKey().notNull(),
	experienceId: int("experience_id").notNull(),
	user: int().notNull(),
	salary: varchar({ length: 250 }),
	salaryInhand: varchar("salary_inhand", { length: 50 }),
	salaryMode: varchar("salary_mode", { length: 50 }),
	designation: int(),
	workedTillDate: varchar("worked_till_date", { length: 250 }),
	status: int().default(1).notNull(),
	type: int().notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybUserUpdateExperienceHistory = mysqlTable("cyb_user_update_experience_history", {
	id: int().autoincrement().primaryKey().notNull(),
	updateId: int("update_id"),
	parent: int().default(0),
	experienceId: int("experience_id").notNull(),
	user: int().notNull(),
	salary: varchar({ length: 250 }),
	salaryInhand: varchar("salary_inhand", { length: 50 }),
	salaryMode: varchar("salary_mode", { length: 50 }),
	designation: int(),
	workedTillDate: varchar("worked_till_date", { length: 250 }),
	status: int().default(1).notNull(),
	type: int().notNull(),
	isDeleted: int("is_deleted").default(0).notNull(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybVerifyDocument = mysqlTable("cyb_verify_document", {
	id: int().autoincrement().primaryKey().notNull(),
	userId: int("user_id"),
	doctype: varchar({ length: 20 }),
	docName: text("doc_name"),
	docnumber: text(),
	methodType: varchar("method_type", { length: 20 }),
	verify: int().default(0),
	clientId: text("client_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
},
	(table) => [
		index("document_verify").on(table.verify, table.methodType, table.userId),
	]);

export const cybViewImpressions = mysqlTable("cyb_view_impressions", {
	id: int().autoincrement().primaryKey().notNull(),
	currentUser: int("current_user").notNull(),
	remoteId: int("remote_id").notNull(),
	type: mysqlEnum(['Profile', 'Job']),
	isDeleted: tinyint("is_deleted").default(0).notNull(),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});

export const cybWebMenu = mysqlTable("cyb_web_menu", {
	id: int().autoincrement().primaryKey().notNull(),
	parentId: int("parent_id"),
	type: int(),
	name: varchar({ length: 250 }),
	icon: text(),
	link: varchar({ length: 250 }),
	sortOrder: int("sort_order"),
	status: int(),
	createDate: varchar("create_date", { length: 250 }),
	modifyDate: varchar("modify_date", { length: 250 }),
});

export const cybWidgets = mysqlTable("cyb_widgets", {
	id: int().autoincrement().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	status: int().default(1),
	createDate: varchar("create_date", { length: 20 }),
});

export const cybWidgetPosition = mysqlTable("cyb_widget_position", {
	id: int().autoincrement().primaryKey().notNull(),
	widgetId: int("widget_id").notNull(),
	placement: int(),
	variant: varchar({ length: 50 }),
	limitRecord: int("limit_record"),
});

export const cybWorkType = mysqlTable("cyb_work_type", {
	id: int().autoincrement().primaryKey().notNull(),
	name: text(),
	status: int().default(1).notNull(),
	userDefined: int("user_defined"),
	userId: int("user_id"),
	createDate: datetime("create_date", { mode: 'string' }),
	modifyDate: datetime("modify_date", { mode: 'string' }),
});
