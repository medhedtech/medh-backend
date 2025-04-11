import Joi from "joi";

export const validateBlog = (data) => {
  const schema = Joi.object({
    title: Joi.string().required().max(200),
    description: Joi.string().allow("", null),
    content: Joi.string().required(),
    excerpt: Joi.string().max(500),
    blog_link: Joi.string().allow("", null),
    upload_image: Joi.string().required(),
    categories: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    meta_title: Joi.string().max(60).allow("", null),
    meta_description: Joi.string().max(160).allow("", null),
    status: Joi.string().valid("draft", "published", "archived"),
    featured: Joi.boolean(),
    author: Joi.string(),
  });

  return schema.validate(data, { stripUnknown: true });
};

export const validateComment = (data) => {
  const schema = Joi.object({
    content: Joi.string().required().min(1).max(1000),
  });

  return schema.validate(data);
};

export const validateBlogStatus = (data) => {
  const schema = Joi.object({
    status: Joi.string().valid("draft", "published", "archived").required(),
  });

  return schema.validate(data);
};
