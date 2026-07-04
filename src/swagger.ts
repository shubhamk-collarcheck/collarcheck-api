const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "CollerCheck API",
    version: "1.0.0",
    description: "API documentation for CollerCheck",
  },
  servers: [
    {
      url: "http://localhost:3030",
      description: "Development server",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      EmploymentBody: {
        type: "object",
        required: [
          "company",
          "designation",
          "department",
          "employment_type",
          "joining_date",
          "salary",
          "salary_inhand",
          "salary_mode",
        ],
        properties: {
          company: {
            oneOf: [
              { type: "number", description: "Company ID" },
              { type: "string", description: "Company name" },
            ],
          },
          designation: {
            oneOf: [
              { type: "number", description: "Designation ID" },
              { type: "string", description: "Designation name" },
            ],
          },
          department: {
            oneOf: [
              { type: "number", description: "Department ID" },
              { type: "string", description: "Department name" },
            ],
          },
          skill: {
            type: "array",
            items: { type: "string" },
            default: [],
          },
          employment_type: {
            type: "integer",
            description: "Employment type ID",
          },
          description: {
            type: "string",
            maxLength: 5000,
            default: "",
          },
          joining_date: {
            type: "string",
            format: "date",
          },
          worked_till_date: {
            type: "string",
            description: "Date or 'present' if still working",
          },
          salary: {
            type: "string",
          },
          salary_inhand: {
            type: "string",
            enum: ["In Hand", "CTC"],
          },
          salary_mode: {
            type: "string",
            enum: ["Per Month", "Annually"],
          },
          hired: {
            type: "boolean",
            default: false,
          },
          still_working: {
            type: "boolean",
            default: false,
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          done: {},
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/wapi/employee/add-employment": {
      post: {
        tags: ["Employee"],
        summary: "Add employment experience",
        description: "Create a new employment record for the authenticated user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
                  "company",
                  "designation",
                  "department",
                  "employment_type",
                  "joining_date",
                  "salary",
                  "salary_inhand",
                  "salary_mode",
                ],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Resume or document file",
                  },
                  company: {
                    oneOf: [
                      { type: "number", description: "Company ID" },
                      { type: "string", description: "Company name" },
                    ],
                  },
                  designation: {
                    oneOf: [
                      { type: "number", description: "Designation ID" },
                      { type: "string", description: "Designation name" },
                    ],
                  },
                  department: {
                    oneOf: [
                      { type: "number", description: "Department ID" },
                      { type: "string", description: "Department name" },
                    ],
                  },
                  skill: {
                    type: "array",
                    items: { type: "string" },
                    default: [],
                  },
                  employment_type: {
                    type: "integer",
                    description: "Employment type ID",
                  },
                  description: {
                    type: "string",
                    maxLength: 5000,
                    default: "",
                  },
                  joining_date: {
                    type: "string",
                    format: "date",
                  },
                  worked_till_date: {
                    type: "string",
                    description: "Date (YYYY-MM-DD) or 'present' if still working",
                  },
                  salary: {
                    type: "string",
                  },
                  salary_inhand: {
                    type: "string",
                    enum: ["In Hand", "CTC"],
                  },
                  salary_mode: {
                    type: "string",
                    enum: ["Per Month", "Annually"],
                  },
                  hired: {
                    type: "boolean",
                    default: false,
                  },
                  still_working: {
                    type: "boolean",
                    default: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Employment record created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
    },
    "/wapi/employee/add-employment/{employment_id}": {
      post: {
        tags: ["Employee"],
        summary: "Update employment experience",
        description: "Update an existing employment record for the authenticated user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "path",
            name: "employment_id",
            required: true,
            schema: { type: "integer" },
            description: "Employment record ID",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: [
                  "company",
                  "designation",
                  "department",
                  "employment_type",
                  "joining_date",
                  "salary",
                  "salary_inhand",
                  "salary_mode",
                ],
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "Resume or document file",
                  },
                  company: {
                    oneOf: [
                      { type: "number", description: "Company ID" },
                      { type: "string", description: "Company name" },
                    ],
                  },
                  designation: {
                    oneOf: [
                      { type: "number", description: "Designation ID" },
                      { type: "string", description: "Designation name" },
                    ],
                  },
                  department: {
                    oneOf: [
                      { type: "number", description: "Department ID" },
                      { type: "string", description: "Department name" },
                    ],
                  },
                  skill: {
                    type: "array",
                    items: { type: "string" },
                    default: [],
                  },
                  employment_type: {
                    type: "integer",
                    description: "Employment type ID",
                  },
                  description: {
                    type: "string",
                    maxLength: 5000,
                    default: "",
                  },
                  joining_date: {
                    type: "string",
                    format: "date",
                  },
                  worked_till_date: {
                    type: "string",
                    description: "Date (YYYY-MM-DD) or 'present' if still working",
                  },
                  salary: {
                    type: "string",
                  },
                  salary_inhand: {
                    type: "string",
                    enum: ["In Hand", "CTC"],
                  },
                  salary_mode: {
                    type: "string",
                    enum: ["Per Month", "Annually"],
                  },
                  hired: {
                    type: "boolean",
                    default: false,
                  },
                  still_working: {
                    type: "boolean",
                    default: false,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Employment record updated successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SuccessResponse",
                },
              },
            },
          },
          400: {
            description: "Validation error",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ErrorResponse",
                },
              },
            },
          },
          401: {
            description: "Unauthorized",
          },
        },
      },
    },
  },
};

export default swaggerSpec;
