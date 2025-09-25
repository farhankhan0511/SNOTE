import User from "../Model/UserModel.js";

export const updateStreaks = async (userId, studyMinutes) => {
  if (studyMinutes < 10) return; // ✅ Only update streak if studied >= 10 min

  const user = await User.findById(userId);
  if (!user) return;

  if (!user.streaks) {
    user.streaks = { current: 0, max: 0, lastStudyDate: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let lastStudyDay = user.streaks.lastStudyDate
    ? new Date(user.streaks.lastStudyDate)
    : null;

  if (lastStudyDay) lastStudyDay.setHours(0, 0, 0, 0);

  if (!lastStudyDay) {
    // ✅ First ever streak
    user.streaks.current = 1;
  } else {
    const diff = today - lastStudyDay;

    if (diff === 86400000) {
      // ✅ Consecutive day → increment streak
      user.streaks.current += 1;
    } else if (diff > 86400000) {
      // ✅ Missed a day → reset streak
      user.streaks.current = 1;
    } else {
      // ✅ Same day → don’t double-count
      return;
    }
  }

  // ✅ Keep track of max streak
  if (user.streaks.current > user.streaks.max) {
    user.streaks.max = user.streaks.current;
  }

  // ✅ Update last study date
  user.streaks.lastStudyDate = today;

  await user.save();
};
