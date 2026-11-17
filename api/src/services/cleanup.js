const Discovery = require("../models/Discovery");
const Favorite = require("../models/Favorite");
const ChatSession = require("../models/ChatSession");
const AiUsage = require("../models/AiUsage");

async function deleteUserData(userId) {
  await Promise.all([Discovery.deleteMany({ user: userId }), Favorite.deleteMany({ user: userId }), ChatSession.deleteMany({ user: userId }), AiUsage.deleteMany({ user: userId })]);
}

module.exports = { deleteUserData };
