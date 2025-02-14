const joi = require("joi");

const userValidation = joi.object({
  full_name: joi.string(),
  email: joi.string().email().trim(true),
  password: joi.string().min(8).trim(true),
  phone_number: joi
    .string()
    .length(10)
    .pattern(/[6-9]{1}[0-9]{9}/),
  agree_terms: joi.boolean().valid(true),
  role: joi.string().valid("student", "admin", "user", "instructor"),
  role_description: joi.string().allow(""),
  assign_department: joi.array().items(joi.string()),
  permissions: joi.array().items(joi.string()),
  age: joi.number().min(0),
  admin_role: joi.string().valid("admin", "super-admin", "cooporate-admin"),
});

module.exports = userValidation;
