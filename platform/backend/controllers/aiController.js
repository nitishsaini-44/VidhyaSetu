const AIConversation = require('../models/AIConversation');
const Performance = require('../models/Performance');
const geminiService = require('../services/geminiService');

// @desc    Chat with AI assistant
// @route   POST /api/ai/chat
// @access  Private (Student/Teacher)
const chat = async (req, res) => {
  try {
    const { message, image, conversationId, context } = req.body;
    const userId = req.user._id;

    if (!message && !image) {
      return res.status(400).json({ message: 'Message or image is required' });
    }

    // Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findOne({ _id: conversationId, user: userId });
    }
    
    if (!conversation) {
      conversation = new AIConversation({
        user: userId,
        messages: [],
        context: context || {}
      });
    }

    // Build the prompt with context
    let prompt = '';
    
    if (context) {
      prompt += `You are VidyaSetu AI, an educational assistant helping ${context.studentName || 'a student'}`;
      if (context.class) prompt += ` in class ${context.class}`;
      prompt += '.\n\n';
    } else {
      prompt += 'You are VidyaSetu AI, a friendly and knowledgeable educational assistant. ';
      prompt += 'Help students with their academic queries in a clear, concise, and encouraging way.\n\n';
    }

    // Add conversation history for context (last 5 messages)
    const recentMessages = conversation.messages.slice(-10);
    if (recentMessages.length > 0) {
      prompt += 'Previous conversation:\n';
      recentMessages.forEach(msg => {
        prompt += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
      });
      prompt += '\n';
    }

    // Add current message
    prompt += `Student's question: ${message}\n\n`;
    
    if (image) {
      prompt += 'The student has also uploaded an image with their question. ';
      prompt += 'Analyze the image (which may contain a math problem, diagram, or text) and provide a helpful response.\n\n';
    }

    prompt += 'Please provide a helpful, educational response. ';
    prompt += 'Use markdown formatting for better readability (headers, bullet points, bold text). ';
    prompt += 'If explaining a concept, break it down into steps. ';
    prompt += 'Be encouraging and supportive.';

    // Generate response using Gemini
    let aiResponse;
    try {
      if (image) {
        // For image analysis, use vision capabilities
        aiResponse = await geminiService.generateWithImage(prompt, image);
      } else {
        aiResponse = await geminiService.generateContent(prompt);
      }
    } catch (error) {
      console.error('Gemini API error:', error);
      aiResponse = "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }

    // Save messages to conversation
    conversation.messages.push({ role: 'user', content: message, timestamp: new Date() });
    conversation.messages.push({ role: 'assistant', content: aiResponse, timestamp: new Date() });
    conversation.updatedAt = new Date();
    
    await conversation.save();

    res.json({
      response: aiResponse,
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Error processing chat', error: error.message });
  }
};

// @desc    Generate personalized learning roadmap
// @route   POST /api/ai/generate-roadmap
// @access  Private (Student)
const generateRoadmap = async (req, res) => {
  try {
    const userId = req.user._id;
    const studentName = req.user.name;
    const studentClass = req.user.studentInfo?.class || req.user.class_id;

    // Get student's performance data
    const performances = await Performance.find({ student: userId })
      .sort({ date: -1 })
      .limit(20);

    // Analyze performance by subject
    const subjectStats = {};
    performances.forEach(p => {
      const subject = p.subject || 'General';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { total: 0, scores: [], topics: [] };
      }
      subjectStats[subject].total++;
      subjectStats[subject].scores.push(p.percentage);
      if (p.quiz_topic) subjectStats[subject].topics.push(p.quiz_topic);
    });

    // Build analysis for prompt
    let performanceAnalysis = '';
    Object.keys(subjectStats).forEach(subject => {
      const stats = subjectStats[subject];
      const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      performanceAnalysis += `- ${subject}: ${stats.total} quizzes, average score ${avgScore.toFixed(1)}%\n`;
      if (avgScore < 60) performanceAnalysis += `  (Needs improvement)\n`;
    });

    const prompt = `
You are VidyaSetu AI, an expert educational consultant. Create a personalized learning roadmap for a student.

Student Information:
- Name: ${studentName}
- Class: ${studentClass || 'Not specified'}

Performance Summary:
${performanceAnalysis || 'No quiz data available yet'}

Based on this information, create a 4-week learning roadmap. Return the response as a JSON object with this structure:
{
  "title": "Personalized Learning Journey for [Student Name]",
  "summary": "A brief encouraging summary of the roadmap",
  "phases": [
    {
      "name": "Week 1: Foundation Building",
      "duration": "Week 1",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    },
    {
      "name": "Week 2: Strengthening Basics",
      "duration": "Week 2",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    },
    {
      "name": "Week 3: Advanced Practice",
      "duration": "Week 3",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    },
    {
      "name": "Week 4: Mastery & Review",
      "duration": "Week 4",
      "tasks": ["Task 1", "Task 2", "Task 3"]
    }
  ],
  "tips": ["Study tip 1", "Study tip 2", "Study tip 3"]
}

Focus on:
1. Subjects where the student needs improvement (score < 60%)
2. Building on strengths
3. Practical, actionable tasks
4. Encouraging language

Return ONLY valid JSON, no markdown code blocks or extra text.`;

    const response = await geminiService.generateJSON(prompt);

    res.json({ roadmap: response });

  } catch (error) {
    console.error('Generate roadmap error:', error);
    res.status(500).json({ message: 'Error generating roadmap', error: error.message });
  }
};

// @desc    Analyze student performance
// @route   POST /api/ai/analyze-performance
// @access  Private (Student)
const analyzePerformance = async (req, res) => {
  try {
    const userId = req.user._id;
    const studentName = req.user.name;

    // Get performance data
    const performances = await Performance.find({ student: userId })
      .sort({ date: -1 })
      .limit(30);

    if (performances.length === 0) {
      return res.json({
        analysis: {
          overallGrade: 'N/A',
          consistency: 0,
          trend: 0,
          strengths: ['Take some quizzes to see your strengths!'],
          weaknesses: ['No data available yet'],
          detailedAnalysis: 'Start taking quizzes to get personalized performance analysis.',
          recommendations: ['Explore different subjects', 'Take your first quiz', 'Ask questions using the AI chatbot']
        }
      });
    }

    // Calculate statistics
    const scores = performances.map(p => p.percentage);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Calculate trend (compare first half to second half)
    const midPoint = Math.floor(scores.length / 2);
    const recentAvg = scores.slice(0, midPoint).reduce((a, b) => a + b, 0) / (midPoint || 1);
    const olderAvg = scores.slice(midPoint).reduce((a, b) => a + b, 0) / ((scores.length - midPoint) || 1);
    const trend = recentAvg - olderAvg;

    // Calculate consistency (inverse of standard deviation)
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, Math.min(100, 100 - stdDev));

    // Subject-wise analysis
    const subjectStats = {};
    performances.forEach(p => {
      const subject = p.subject || 'General';
      if (!subjectStats[subject]) {
        subjectStats[subject] = { scores: [], topics: [] };
      }
      subjectStats[subject].scores.push(p.percentage);
      if (p.quiz_topic) subjectStats[subject].topics.push(p.quiz_topic);
    });

    let subjectAnalysis = '';
    const strengths = [];
    const weaknesses = [];
    
    Object.keys(subjectStats).forEach(subject => {
      const subjAvg = subjectStats[subject].scores.reduce((a, b) => a + b, 0) / subjectStats[subject].scores.length;
      subjectAnalysis += `- ${subject}: ${subjAvg.toFixed(1)}% average\n`;
      
      if (subjAvg >= 75) {
        strengths.push(`Strong performance in ${subject} (${subjAvg.toFixed(0)}% average)`);
      } else if (subjAvg < 60) {
        weaknesses.push(`Needs improvement in ${subject} (${subjAvg.toFixed(0)}% average)`);
      }
    });

    // Build prompt for AI analysis
    const prompt = `
You are VidyaSetu AI, an educational analyst. Analyze a student's performance and provide insights.

Student: ${studentName}
Overall Average: ${avgScore.toFixed(1)}%
Total Quizzes: ${performances.length}
Consistency Score: ${consistency.toFixed(0)}%
Trend: ${trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable'} (${trend.toFixed(1)}%)

Subject-wise Performance:
${subjectAnalysis}

Recent Quiz Topics: ${performances.slice(0, 5).map(p => p.quiz_topic).filter(Boolean).join(', ') || 'Various'}

Provide a detailed analysis in JSON format:
{
  "overallGrade": "A+/A/B+/B/C+/C/D/F based on average score",
  "consistency": ${consistency.toFixed(0)},
  "trend": ${trend.toFixed(1)},
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "weaknesses": ["Area to improve 1", "Area to improve 2"],
  "detailedAnalysis": "2-3 paragraph detailed analysis of the student's performance, patterns observed, and potential reasons for performance trends",
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2", "Actionable recommendation 3", "Actionable recommendation 4"]
}

Be encouraging but honest. Focus on actionable insights.
Return ONLY valid JSON, no markdown code blocks.`;

    const analysis = await geminiService.generateJSON(prompt);

    // Merge calculated values with AI response
    analysis.consistency = Math.round(consistency);
    analysis.trend = Math.round(trend * 10) / 10;

    res.json({ analysis });

  } catch (error) {
    console.error('Analyze performance error:', error);
    res.status(500).json({ message: 'Error analyzing performance', error: error.message });
  }
};

// @desc    Get user's conversations
// @route   GET /api/ai/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const conversations = await AIConversation.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(10);
    
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
};

// @desc    Delete a conversation
// @route   DELETE /api/ai/conversations/:id
// @access  Private
const deleteConversation = async (req, res) => {
  try {
    await AIConversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting conversation', error: error.message });
  }
};

module.exports = {
  chat,
  generateRoadmap,
  analyzePerformance,
  getConversations,
  deleteConversation
};
