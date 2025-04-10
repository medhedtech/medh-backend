import ContactForm from "../models/contact-modal.js";

// Create a new form submission
export const createContact = async (req, res) => {
  try {
    const {
      full_name,
      email,
      country,
      phone_number,
      message,
      accept,
      resume_image,
      page_title,
    } = req.body;
    const contactForm = new ContactForm({
      full_name,
      email,
      country,
      phone_number,
      message,
      accept,
      resume_image,
      page_title,
    });
    await contactForm.save();

    res.status(201).json({
      success: true,
      message: "Form submitted successfully",
      data: contactForm,
    });
  } catch (err) {
    console.error("Error submitting form:", err.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve all form submissions
export const getAllContact = async (req, res) => {
  try {
    const forms = await ContactForm.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: forms });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Retrieve a single form submission by ID
export const getContactById = async (req, res) => {
  try {
    const contact = await ContactForm.findById(req.params.id);
    if (!contact)
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    res.status(200).json({ success: true, data: contact });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Update a form submission by ID
export const updateContact = async (req, res) => {
  try {
    const updatedContact = await ContactForm.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedContact)
      return res
        .status(404)
        .json({ success: false, message: "Contact not found" });
    res.status(200).json({ success: true, data: updatedContact });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

// Delete a form submission by ID
export const deleteContact = async (req, res) => {
  try {
    const deletedForm = await ContactForm.findByIdAndDelete(req.params.id);
    if (!deletedForm)
      return res
        .status(404)
        .json({ success: false, message: "Form not found" });
    res
      .status(200)
      .json({ success: true, message: "Form deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};
