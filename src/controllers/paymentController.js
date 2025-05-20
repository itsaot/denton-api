const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'zar' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: { userId: req.user._id.toString() }
    });
    res.send({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
