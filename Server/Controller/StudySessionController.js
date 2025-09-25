import mongoose from "mongoose";
import StudySession from "../Model/StudySession.js";
import User from "../Model/UserModel.js";
import calculateStats from "../utils/TimerStatsCalculator.js";
import { updateStreaks } from "../utils/streakUpdater.js";

const createStudySession = async (req, res) => {
  try {
    const { startTime, endTime, duration } = req.body;
    console.log("Timer");
    if (duration > 10) updateStreaks(req.user.id);
    const session = new StudySession({
      user: req.user.id,
      startTime,
      endTime,
      duration,
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error("Study session save error:", error); // More detailed logging
    res.status(500).json({ error: error.message });
  }
};

const getStudySessionStats = async (req, res) => {
  try {
    const { period } = req.query;
    const validPeriods = ["hourly", "daily", "weekly", "monthly"];
    if (!validPeriods.includes(period)) {
      return res.status(400).json("Invalid period");
    }
    const stats = await calculateStats(req.user.id, period);
    res.json(stats);
  } catch (error) {
    res.status(500).json(error.message);
  }
};

// Helper function to get user study stats without HTTP handling
const getUserStats = async (userId) => {
  // Get user's streak information
  const user = await User.findById(userId).select("streaks");

  // Calculate total study hours for different time periods
  const now = new Date();

  // Today (from midnight)
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // This week (from Monday)
  const weekStart = new Date(now);
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // All time
  const allTimeStart = new Date(0);

  // Aggregate study sessions for different periods
  const [todayStats, weekStats, monthStats, allTimeStats] = await Promise.all([
    StudySession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: todayStart },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $divide: ["$duration", 60] } },
        },
      },
    ]),
    StudySession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: weekStart },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $divide: ["$duration", 60] } },
        },
      },
    ]),
    StudySession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $divide: ["$duration", 60] } },
        },
      },
    ]),
    StudySession.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          startTime: { $gte: allTimeStart },
        },
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: { $divide: ["$duration", 60] } },
        },
      },
    ]),
  ]);

  // Get user's rank among all users based on total study hours
  const userRank = await StudySession.aggregate([
    {
      $group: {
        _id: "$user",
        totalHours: { $sum: { $divide: ["$duration", 60] } },
      },
    },
    { $sort: { totalHours: -1 } },
  ]);

  const currentUserRank =
    userRank.findIndex((item) => item._id.toString() === userId) + 1;

  // Calculate remaining time to next level (assuming 2 hours per level)
  const totalHours = allTimeStats[0]?.totalHours || 0;
  const currentLevel = Math.floor(totalHours / 2) + 1;
  const hoursInCurrentLevel = totalHours % 2;
  const hoursToNextLevel = 2 - hoursInCurrentLevel;

  // Determine level name based on total hours
  let levelName = "Beginner";
  if (totalHours >= 10) levelName = "Intermediate";
  if (totalHours >= 25) levelName = "Advanced";
  if (totalHours >= 50) levelName = "Expert";
  if (totalHours >= 100) levelName = "Master";

  return {
    timePeriods: {
      today: (todayStats[0]?.totalHours || 0).toFixed(1),
      thisWeek: (weekStats[0]?.totalHours || 0).toFixed(1),
      thisMonth: (monthStats[0]?.totalHours || 0).toFixed(1),
      allTime: (allTimeStats[0]?.totalHours || 0).toFixed(1),
    },
    rank: currentUserRank,
    totalUsers: userRank.length,
    streak: user?.streaks?.current || 0,
    maxStreak: user?.streaks?.max || 0,
    level: {
      name: levelName,
      current: currentLevel,
      hoursInCurrentLevel: hoursInCurrentLevel.toFixed(1),
      hoursToNextLevel: hoursToNextLevel.toFixed(1),
      progress: ((hoursInCurrentLevel / 2) * 100).toFixed(1),
    },
  };
};

// Helper function to get leaderboard data without HTTP handling
const getLeaderboardData = async (period, friendsOnly, userId) => {
  const validPeriods = ["hourly", "daily", "weekly", "monthly"];
  if (!validPeriods.includes(period)) {
    throw new Error("Invalid period");
  }

  const now = new Date();
  let startDate;
  if (period === "daily") {
    startDate = new Date(now.setHours(0, 0, 0, 0));
  } else if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  let userIdsToInclude;
  if (friendsOnly) {
    const user = await User.findById(userId).select("friends");
    userIdsToInclude = [userId, ...(user.friends || [])];
  }

  const matchStage = {
    startTime: { $gte: startDate },
  };
  if (friendsOnly) {
    matchStage.user = {
      $in: userIdsToInclude.map((id) =>
        typeof id === "string" ? new mongoose.Types.ObjectId(id) : id
      ),
    };
  }

  // Finding total duration of users and formatting the output
  return await StudySession.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$user",
        totalDuration: { $sum: "$duration" },
      },
    },
    { $sort: { totalDuration: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$user._id",
        username: "$user.FirstName",
        profilePicture: "$user.ProfilePicture",
        totalDuration: 1,
      },
    },
  ]);
};

// Update existing getUserStudyStats to use the helper function
const getUserStudyStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update existing getLeaderboard to use the helper function
const getLeaderboard = async (req, res) => {
  try {
    const { period, friendsOnly } = req.query;
    const userId = req.user?._id;

    const leaderboard = await getLeaderboardData(
      period,
      friendsOnly === "true",
      userId
    );

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Add the new consolidated endpoint
const getConsolidatedStats = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const { period = "weekly", friendsOnly = "false" } = req.query;

    // Fetch all relevant stats in parallel
    const [userStats, periodStats, leaderboardData] = await Promise.all([
      getUserStats(userId),
      calculateStats(userId, period),
      getLeaderboardData(period, friendsOnly === "true", userId),
    ]);

    res.json({
      userStats,
      periodStats,
      leaderboard: leaderboardData,
    });
  } catch (error) {
    console.error("Error fetching consolidated stats:", error);
    res.status(500).json({ error: error.message });
  }
};

// Export all controller functions
export {
  createStudySession,
  getStudySessionStats,
  getUserStudyStats,
  getLeaderboard,
  getConsolidatedStats,
  // Export helper functions too if needed elsewhere
  getUserStats,
  getLeaderboardData,
};
