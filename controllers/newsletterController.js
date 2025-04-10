import NewsletterModel from "../models/newsletter-model.js";

// Add a new subscriber to the newsletter
export const addNewsletter = async (req, res) => {
  try {
    const { email } = req.body;
    const newSubscriber = new NewsletterModel({ email });
    await newSubscriber.save();

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to the newsletter.",
      data: newSubscriber,
    });
  } catch (err) {
    console.error("Error subscribing to newsletter:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to subscribe.",
      error: err.message,
    });
  }
};

// Get all newsletter subscribers
export const getAllSubscribers = async (req, res) => {
  try {
    const subscribers = await NewsletterModel.find();
    res.status(200).json({
      success: true,
      data: subscribers,
    });
  } catch (err) {
    console.error("Error fetching subscribers:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to fetch subscribers.",
      error: err.message,
    });
  }
};

// Delete a subscriber by ID
export const deleteSubscriber = async (req, res) => {
  try {
    const deletedSubscriber = await NewsletterModel.findByIdAndDelete(
      req.params.id
    );
    if (!deletedSubscriber) {
      return res
        .status(404)
        .json({ success: false, message: "Subscriber not found." });
    }
    res.status(200).json({
      success: true,
      message: "Subscriber deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting subscriber:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error. Unable to delete subscriber.",
      error: err.message,
    });
  }
};
