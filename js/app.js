// Global Variables
let currentUser = null;
let currentQuiz = null;
let currentQuestionIndex = 0;
let quizAnswers = [];
let quizTimer = null;
let challenges = [];
let quizzes = [];

// Global variables to track current page
let isDashboardPage = false;
let isIndexPage = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Detect current page
    const currentPath = window.location.pathname;
    isDashboardPage = currentPath.includes('dashboard.html');
    isIndexPage = currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/');

    initializeApp();
});

async function initializeApp() {
    // Load data from API
    await loadData();

    // Check login status and update UI
    checkLoginStatus();

    // Initialize sections based on current page
    if (isIndexPage) {
        initializeChallenges();
        initializeQuizzes();
        initializeLeaderboard();
        initializeAnalytics();
    }

    if (isDashboardPage) {
        initializeDashboard();
    }

    // Initialize event listeners
    initializeEventListeners();
}

// Data Loading Functions
async function loadData() {
    try {
    const API_BASE_URL = 'http://localhost:3000/tables';

    // Load challenges
    const challengesResponse = await fetch(API_BASE_URL + '/challenges');
    const challengesData = await challengesResponse.json();
    challenges = challengesData.data || [];

    // Load quizzes (keep relative URL for quiz section on front page)
    const quizzesResponse = await fetch('tables/quizzes');
    const quizzesData = await quizzesResponse.json();
    quizzes = quizzesData.data || [];
        
        console.log('Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // Use fallback data if API fails
        loadFallbackData();
    }
}

function loadFallbackData() {
    // Fallback challenges data
    challenges = [
        {
            id: "ch1",
            title: "Plant a Tree Challenge",
            description: "Plant a tree in your local community and document the process. Help restore our forests!",
            xp_reward: 200,
            difficulty: "Medium",
            category: "Planting",
            badge_reward: "Tree Hugger",
            deadline: "2024-12-31T23:59:59Z",
            participants_count: 45,
            impact_metric: "1 tree planted = 22 kg CO2 absorbed annually",
            image_url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=200&fit=crop",
            is_active: true
        },
        {
            id: "ch2",
            title: "Recycle 10 Plastic Bottles",
            description: "Collect and properly recycle 10 plastic bottles. Show us your recycling efforts!",
            xp_reward: 100,
            difficulty: "Easy",
            category: "Recycling",
            badge_reward: "Recycling Champion",
            deadline: "2024-11-30T23:59:59Z",
            participants_count: 78,
            impact_metric: "10 bottles = 0.5 kg plastic diverted from landfill",
            image_url: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&h=200&fit=crop",
            is_active: true
        }
    ];
    
    // Fallback quizzes data
    quizzes = [
        {
            id: "q1",
            title: "Climate Change Basics",
            category: "Climate Change",
            difficulty: "Beginner",
            questions: [
                {
                    question: "What is the main cause of climate change?",
                    options: ["Solar flares", "Greenhouse gases", "Ocean currents", "Volcanic activity"],
                    correct: 1
                },
                {
                    question: "Which gas contributes most to global warming?",
                    options: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
                    correct: 2
                }
            ],
            xp_per_question: 50,
            time_limit: 10,
            total_attempts: 156,
            average_score: 78.5,
            is_active: true
        }
    ];
}

// Authentication Functions
function checkLoginStatus() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        // Track daily login on page load if user is logged in
        trackDailyLogin();
        showDashboardContent();
        updateLoginButton();
        // Show dashboard content explicitly for testing
        document.getElementById('dashboardContent').classList.remove('hidden');
        document.getElementById('loginRequired').classList.add('hidden');
    } else {
        showLoginRequired();
    }
}

function showDashboardContent() {
    document.getElementById('dashboardContent').classList.remove('hidden');
    document.getElementById('loginRequired').classList.add('hidden');
    updateDashboardData();
}

function showLoginRequired() {
    document.getElementById('dashboardContent').classList.add('hidden');
    document.getElementById('loginRequired').classList.remove('hidden');
}

function updateLoginButton() {
    const loginBtn = document.getElementById('loginBtn');
    if (currentUser) {
        loginBtn.innerHTML = `<i class="fas fa-user mr-2"></i>${currentUser.name}`;
        if (isDashboardPage) {
            loginBtn.onclick = () => window.location.reload(); // Stay on dashboard
        } else {
            loginBtn.onclick = () => scrollToSection('dashboard');
        }
    }
}

// Dashboard Functions
function initializeDashboard() {
    if (currentUser) {
        updateDashboardData();
    }
}

function loadDashboardAnalytics() {
    // Load analytics data for dashboard
    loadAnalyticsData();
    initializeCharts();
}

function updateDashboardData() {
    if (!currentUser) return;
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userCollege').textContent = currentUser.college;
    document.getElementById('userLevel').textContent = currentUser.level;
    document.getElementById('userXP').textContent = currentUser.xp_points;
    document.getElementById('userBadgesCount').textContent = currentUser.badges.length;
    document.getElementById('userAvatar').src = currentUser.avatar_url;
    
    // Calculate progress to next level
    const nextLevel = currentUser.level + 1;
    const currentLevelMinXP = currentUser.level * 500;
    const nextLevelMinXP = nextLevel * 500;
    const currentLevelXP = currentUser.xp_points - currentLevelMinXP;
    const xpNeededForNext = nextLevelMinXP - currentLevelMinXP;
    const progressPercent = (currentLevelXP / xpNeededForNext) * 100;
    
    document.getElementById('nextLevel').textContent = nextLevel;
    document.getElementById('currentLevelXP').textContent = currentLevelXP;
    document.getElementById('nextLevelXP').textContent = xpNeededForNext;
    document.getElementById('progressBar').style.width = `${Math.min(progressPercent, 100)}%`;
    
    // Update recent activity
    updateRecentActivity();

    // Update daily login report
    updateDailyLoginReport();
}

function updateRecentActivity() {
    const activityContainer = document.getElementById('recentActivity');
    const activities = [
        { icon: 'trophy', text: 'Completed "Plant a Tree Challenge"', time: '2 hours ago', color: 'green' },
        { icon: 'brain', text: 'Scored 85% on Climate Change Quiz', time: '1 day ago', color: 'blue' },
        { icon: 'medal', text: 'Earned "Eco Warrior" badge', time: '3 days ago', color: 'purple' },
        { icon: 'chart-bar', text: 'Saved 150L of water this week', time: '5 days ago', color: 'orange' }
    ];

    activityContainer.innerHTML = activities.map(activity => `
        <div class="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div class="w-10 h-10 bg-${activity.color}-100 rounded-full flex items-center justify-center">
                <i class="fas fa-${activity.icon} text-${activity.color}-600"></i>
            </div>
            <div class="flex-grow">
                <div class="text-gray-800 font-medium">${activity.text}</div>
                <div class="text-gray-500 text-sm">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Daily Login Report Functions
function trackDailyLogin() {
    const today = new Date().toISOString().split("T")[0];
    const loginData = JSON.parse(localStorage.getItem("dailyLoginData")) || {};

    if (loginData[today]) {
        loginData[today] += 1;
    } else {
        loginData[today] = 1;
    }

    localStorage.setItem("dailyLoginData", JSON.stringify(loginData));
}

function updateDailyLoginReport() {
    const loginReportContainer = document.getElementById("loginReportContent");
    if (!loginReportContainer) return; // Check if element exists

    const user = currentUser;
    if (!user) {
        loginReportContainer.innerHTML = "<p>No login data available.</p>";
        return;
    }

    // Retrieve login data from localStorage
    const loginData = JSON.parse(localStorage.getItem("dailyLoginData")) || {};

    // Format login data for display
    const loginEntries = Object.entries(loginData)
        .sort((a, b) => new Date(b[0]) - new Date(a[0]))
        .slice(0, 7); // Show last 7 days

    if (loginEntries.length === 0) {
        loginReportContainer.innerHTML = "<p>No login data available.</p>";
        return;
    }

    loginReportContainer.innerHTML = loginEntries
        .map(
            ([date, count]) => `
        <div class="flex justify-between border-b border-gray-200 py-2">
            <span>${new Date(date).toLocaleDateString()}</span>
            <span>${count} login${count > 1 ? "s" : ""}</span>
        </div>
    `
        )
        .join("");
}

// Challenges Functions
function initializeChallenges() {
    renderChallenges();
    initializeChallengeFilters();
}

function renderChallenges(filterDifficulty = 'all') {
    const challengesGrid = document.getElementById('challengesGrid');
    const filteredChallenges = filterDifficulty === 'all' 
        ? challenges 
        : challenges.filter(c => c.difficulty === filterDifficulty);
    
    challengesGrid.innerHTML = filteredChallenges.map(challenge => `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden card-hover challenge-card" data-difficulty="${challenge.difficulty}" data-aos="fade-up">
            <img src="${challenge.image_url}" alt="${challenge.title}" class="w-full h-48 object-cover">
            <div class="p-6">
                <div class="flex items-center justify-between mb-3">
                    <span class="px-3 py-1 bg-${getDifficultyColor(challenge.difficulty)}-100 text-${getDifficultyColor(challenge.difficulty)}-600 rounded-full text-sm font-medium">
                        ${challenge.difficulty}
                    </span>
                    <span class="text-green-600 font-semibold">${challenge.xp_reward} XP</span>
                </div>
                
                <h3 class="text-xl font-bold text-gray-800 mb-3">${challenge.title}</h3>
                <p class="text-gray-600 mb-4 line-clamp-3">${challenge.description}</p>
                
                <div class="flex items-center text-gray-500 text-sm mb-4">
                    <i class="fas fa-users mr-2"></i>
                    <span>${challenge.participants_count} participants</span>
                </div>
                
                <div class="bg-green-50 p-3 rounded-lg mb-4">
                    <div class="text-green-700 text-sm font-medium">Environmental Impact:</div>
                    <div class="text-green-600 text-sm">${challenge.impact_metric}</div>
                </div>
                
                <div class="flex items-center justify-between">
                    <div class="text-gray-500 text-sm">
                        <i class="fas fa-calendar mr-1"></i>
                        Due: ${formatDate(challenge.deadline)}
                    </div>
                    ${challenge.badge_reward ? `<div class="flex items-center text-purple-600 text-sm">
                        <i class="fas fa-medal mr-1"></i>
                        ${challenge.badge_reward}
                    </div>` : ''}
                </div>
                
                <button onclick="joinChallenge('${challenge.id}')" class="w-full mt-4 btn-primary text-white py-3 rounded-lg font-semibold hover:transform hover:scale-105 transition-all duration-300">
                    <i class="fas fa-plus mr-2"></i>
                    Join Challenge
                </button>
            </div>
        </div>
    `).join('');
}

function initializeChallengeFilters() {
    document.querySelectorAll('.challenge-filter').forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.challenge-filter').forEach(btn => {
                btn.classList.remove('active', 'bg-green-500', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            });
            
            this.classList.add('active', 'bg-green-500', 'text-white');
            this.classList.remove('bg-gray-200', 'text-gray-700');
            
            // Filter challenges
            const filter = this.getAttribute('data-filter');
            renderChallenges(filter);
        });
    });
}

function joinChallenge(challengeId) {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    
    // Add to user's completed challenges
    if (!currentUser.completed_challenges.includes(challengeId)) {
        currentUser.completed_challenges.push(challengeId);
        currentUser.xp_points += challenge.xp_reward;
        
        if (challenge.badge_reward && !currentUser.badges.includes(challenge.badge_reward)) {
            currentUser.badges.push(challenge.badge_reward);
        }
        
        // Calculate new level
        currentUser.level = Math.floor(currentUser.xp_points / 500) + 1;
        
        // Update localStorage
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Show success message
        showSuccessMessage(`Congratulations! You earned ${challenge.xp_reward} XP for joining "${challenge.title}"!`);
        
        // Update dashboard if visible
        if (document.getElementById('dashboardContent').classList.contains('hidden') === false) {
            updateDashboardData();
        }
    } else {
        showInfoMessage('You have already completed this challenge!');
    }
}

// Quiz Functions
function initializeQuizzes() {
    renderQuizSelection();
}

function renderQuizSelection() {
    const quizSelection = document.getElementById('quizSelection');
    
    quizSelection.innerHTML = quizzes.map(quiz => `
        <div class="bg-white rounded-xl shadow-lg p-6 card-hover" data-aos="fade-up">
            <div class="flex items-center justify-between mb-4">
                <span class="px-3 py-1 bg-${getDifficultyColor(quiz.difficulty)}-100 text-${getDifficultyColor(quiz.difficulty)}-600 rounded-full text-sm font-medium">
                    ${quiz.difficulty}
                </span>
                <span class="text-blue-600 font-semibold">${quiz.xp_per_question * quiz.questions.length} XP</span>
            </div>
            
            <h3 class="text-xl font-bold text-gray-800 mb-3">${quiz.title}</h3>
            <p class="text-gray-600 mb-4">Category: ${quiz.category}</p>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="text-center p-3 bg-gray-50 rounded-lg">
                    <div class="text-lg font-semibold text-gray-800">${quiz.questions.length}</div>
                    <div class="text-gray-600 text-sm">Questions</div>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded-lg">
                    <div class="text-lg font-semibold text-gray-800">${quiz.time_limit}</div>
                    <div class="text-gray-600 text-sm">Minutes</div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>${quiz.total_attempts} attempts</span>
                <span>Avg: ${quiz.average_score}%</span>
            </div>
            
            <button onclick="startQuiz('${quiz.id}')" class="w-full btn-primary text-white py-3 rounded-lg font-semibold">
                <i class="fas fa-play mr-2"></i>
                Start Quiz
            </button>
        </div>
    `).join('');
}

function startQuiz(quizId) {
    if (!currentUser) {
        openLoginModal();
        return;
    }
    
    currentQuiz = quizzes.find(q => q.id === quizId);
    if (!currentQuiz) return;
    
    currentQuestionIndex = 0;
    quizAnswers = [];
    
    // Hide quiz selection and show active quiz
    document.getElementById('quizSelection').classList.add('hidden');
    document.getElementById('activeQuiz').classList.remove('hidden');
    document.getElementById('quizResults').classList.add('hidden');
    
    // Initialize quiz UI
    document.getElementById('quizTitle').textContent = currentQuiz.title;
    
    // Start timer
    startQuizTimer();
    
    // Load first question
    loadQuestion();
}

function loadQuestion() {
    const question = currentQuiz.questions[currentQuestionIndex];
    
    document.getElementById('questionCounter').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuiz.questions.length}`;
    document.getElementById('currentQuestion').textContent = question.question;
    
    const optionsContainer = document.getElementById('answerOptions');
    optionsContainer.innerHTML = question.options.map((option, index) => `
        <button class="answer-option w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-green-300 transition-all duration-200" 
                onclick="selectAnswer(${index})" 
                data-index="${index}">
            <div class="flex items-center space-x-3">
                <div class="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center option-indicator">
                    <div class="w-3 h-3 bg-green-500 rounded-full hidden option-selected"></div>
                </div>
                <span>${option}</span>
            </div>
        </button>
    `).join('');
    
    // Update navigation buttons
    document.getElementById('previousBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').textContent = currentQuestionIndex === currentQuiz.questions.length - 1 ? 'Finish Quiz' : 'Next Question';
}

function selectAnswer(answerIndex) {
    // Clear previous selections
    document.querySelectorAll('.answer-option').forEach(option => {
        option.classList.remove('border-green-500', 'bg-green-50');
        option.querySelector('.option-selected').classList.add('hidden');
        option.querySelector('.option-indicator').classList.remove('border-green-500');
    });
    
    // Highlight selected answer
    const selectedOption = document.querySelector(`[data-index="${answerIndex}"]`);
    selectedOption.classList.add('border-green-500', 'bg-green-50');
    selectedOption.querySelector('.option-selected').classList.remove('hidden');
    selectedOption.querySelector('.option-indicator').classList.add('border-green-500');
    
    // Store answer
    quizAnswers[currentQuestionIndex] = answerIndex;
}

function startQuizTimer() {
    const timeLimit = currentQuiz.time_limit * 60; // Convert to seconds
    let timeRemaining = timeLimit;
    
    quizTimer = setInterval(() => {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        document.getElementById('timeRemaining').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeRemaining <= 0) {
            clearInterval(quizTimer);
            finishQuiz();
        }
        
        timeRemaining--;
    }, 1000);
}

function nextQuestion() {
    if (quizAnswers[currentQuestionIndex] === undefined) {
        showInfoMessage('Please select an answer before continuing.');
        return;
    }
    
    if (currentQuestionIndex < currentQuiz.questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        finishQuiz();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
}

function finishQuiz() {
    clearInterval(quizTimer);
    
    // Calculate score
    let correctAnswers = 0;
    currentQuiz.questions.forEach((question, index) => {
        if (quizAnswers[index] === question.correct) {
            correctAnswers++;
        }
    });
    
    const totalQuestions = currentQuiz.questions.length;
    const scorePercentage = Math.round((correctAnswers / totalQuestions) * 100);
    const earnedXP = correctAnswers * currentQuiz.xp_per_question;
    
    // Update user data
    if (!currentUser.completed_quizzes.includes(currentQuiz.id)) {
        currentUser.completed_quizzes.push(currentQuiz.id);
        currentUser.xp_points += earnedXP;
        currentUser.level = Math.floor(currentUser.xp_points / 500) + 1;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
    
    // Show results
    document.getElementById('activeQuiz').classList.add('hidden');
    document.getElementById('quizResults').classList.remove('hidden');
    
    document.getElementById('finalScore').textContent = `${scorePercentage}%`;
    document.getElementById('earnedXP').textContent = `${earnedXP} XP`;
    document.getElementById('correctAnswers').textContent = correctAnswers;
    document.getElementById('incorrectAnswers').textContent = totalQuestions - correctAnswers;
}

function retakeQuiz() {
    if (currentQuiz) {
        startQuiz(currentQuiz.id);
    }
}

function backToQuizSelection() {
    document.getElementById('quizSelection').classList.remove('hidden');
    document.getElementById('activeQuiz').classList.add('hidden');
    document.getElementById('quizResults').classList.add('hidden');
    currentQuiz = null;
}

// Leaderboard Functions
function initializeLeaderboard() {
    loadLeaderboardData();
    initializeLeaderboardTabs();
}

async function loadLeaderboardData() {
    try {
        const response = await fetch(API_BASE_URL + '/users');
        const data = await response.json();
        const users = data.data || [];

        // Sort users by XP for global leaderboard
        const globalRankings = users
            .sort((a, b) => b.xp_points - a.xp_points)
            .slice(0, 10);

        renderGlobalLeaderboard(globalRankings);
        renderCollegeLeaderboard();

    } catch (error) {
        console.error('Error loading leaderboard data:', error);
        renderFallbackLeaderboard();
    }
}

function renderGlobalLeaderboard(rankings) {
    const topStudent = rankings[0];
    if (topStudent) {
        document.getElementById('topStudent').innerHTML = `
            <div class="flex items-center justify-center space-x-4">
                <img src="${topStudent.avatar_url}" alt="${topStudent.name}" class="w-16 h-16 rounded-full border-4 border-yellow-300">
                <div>
                    <div class="text-2xl font-bold">${topStudent.name}</div>
                    <div class="text-yellow-100">${topStudent.college}</div>
                    <div class="text-yellow-200">${topStudent.xp_points} XP • Level ${topStudent.level}</div>
                </div>
            </div>
        `;
    }
    
    const rankingsContainer = document.getElementById('globalRankings');
    rankingsContainer.innerHTML = rankings.map((user, index) => `
        <div class="flex items-center space-x-4 p-4 ${index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50' : 'hover:bg-gray-50'} rounded-lg transition-all duration-200">
            <div class="w-8 h-8 flex items-center justify-center ${getRankColor(index)} rounded-full font-bold text-white">
                ${index + 1}
            </div>
            <img src="${user.avatar_url}" alt="${user.name}" class="w-12 h-12 rounded-full">
            <div class="flex-grow">
                <div class="font-semibold text-gray-800">${user.name}</div>
                <div class="text-gray-600 text-sm">${user.college}</div>
            </div>
            <div class="text-right">
                <div class="font-bold text-gray-800">${user.xp_points} XP</div>
                <div class="text-gray-600 text-sm">Level ${user.level}</div>
            </div>
            <div class="flex space-x-1">
                ${user.badges.slice(0, 3).map(badge => `
                    <div class="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-medal text-purple-600 text-xs"></i>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function renderCollegeLeaderboard() {
    // Mock college data
    const collegeData = [
        { name: "Green Valley University", totalXP: 15420, students: 234, level: "Platinum" },
        { name: "Tech Institute", totalXP: 12890, students: 189, level: "Gold" },
        { name: "State University", totalXP: 11650, students: 156, level: "Gold" },
        { name: "Central College", totalXP: 9870, students: 123, level: "Silver" },
        { name: "Community College", totalXP: 8760, students: 98, level: "Silver" }
    ];
    
    const topCollege = collegeData[0];
    document.getElementById('topCollege').innerHTML = `
        <div class="text-center">
            <div class="text-2xl font-bold">${topCollege.name}</div>
            <div class="text-blue-100">${topCollege.students} Students</div>
            <div class="text-blue-200">${topCollege.totalXP.toLocaleString()} Total XP • ${topCollege.level} Level</div>
        </div>
    `;
    
    const collegeRankings = document.getElementById('collegeRankings');
    collegeRankings.innerHTML = collegeData.map((college, index) => `
        <div class="flex items-center space-x-4 p-4 ${index < 3 ? 'bg-gradient-to-r from-blue-50 to-purple-50' : 'hover:bg-gray-50'} rounded-lg transition-all duration-200">
            <div class="w-8 h-8 flex items-center justify-center ${getRankColor(index)} rounded-full font-bold text-white">
                ${index + 1}
            </div>
            <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <i class="fas fa-university text-blue-600"></i>
            </div>
            <div class="flex-grow">
                <div class="font-semibold text-gray-800">${college.name}</div>
                <div class="text-gray-600 text-sm">${college.students} students</div>
            </div>
            <div class="text-right">
                <div class="font-bold text-gray-800">${college.totalXP.toLocaleString()} XP</div>
                <div class="text-gray-600 text-sm">${college.level} Level</div>
            </div>
        </div>
    `).join('');
}

function initializeLeaderboardTabs() {
    document.querySelectorAll('.leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabType = this.getAttribute('data-tab');
            
            // Update tab appearance
            document.querySelectorAll('.leaderboard-tab').forEach(t => {
                t.classList.remove('active', 'bg-white', 'text-gray-800', 'shadow-sm');
                t.classList.add('text-gray-600');
            });
            
            this.classList.add('active', 'bg-white', 'text-gray-800', 'shadow-sm');
            this.classList.remove('text-gray-600');
            
            // Show/hide content
            document.querySelectorAll('.leaderboard-content').forEach(content => {
                content.classList.add('hidden');
            });
            
            document.getElementById(`${tabType}Leaderboard`).classList.remove('hidden');
        });
    });
}

// Analytics Functions
function initializeAnalytics() {
    loadAnalyticsData();
    initializeCharts();
}

async function loadAnalyticsData() {
    try {
        const response = await fetch('tables/analytics');
        const data = await response.json();
        const analyticsData = data.data || [];
        
        updateAnalyticsSummary(analyticsData);
    } catch (error) {
        console.error('Error loading analytics data:', error);
        updateAnalyticsSummary([]);
    }
}

function updateAnalyticsSummary(data) {
    // Calculate totals
    const totals = {
        trees: data.filter(d => d.metric_type === 'trees_planted').reduce((sum, d) => sum + d.value, 0),
        plastic: data.filter(d => d.metric_type === 'plastic_recycled').reduce((sum, d) => sum + d.value, 0),
        co2: data.filter(d => d.metric_type === 'co2_saved').reduce((sum, d) => sum + d.value, 0),
        water: data.filter(d => d.metric_type === 'water_saved').reduce((sum, d) => sum + d.value, 0)
    };
    
    // Update summary cards in dashboard
    const treesElem = document.getElementById('dashboardTrees');
    const plasticElem = document.getElementById('dashboardPlastic');
    const co2Elem = document.getElementById('dashboardCO2');
    const waterElem = document.getElementById('dashboardWater');

    if (treesElem) treesElem.textContent = totals.trees.toLocaleString();
    if (plasticElem) plasticElem.textContent = totals.plastic.toFixed(1);
    if (co2Elem) co2Elem.textContent = totals.co2.toFixed(1);
    if (waterElem) waterElem.textContent = totals.water.toLocaleString();
}

function initializeCharts() {
    // Load Chart.js if not already loaded
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = createCharts;
        document.head.appendChild(script);
    } else {
        createCharts();
    }
}

function createCharts() {
    // Monthly Impact Chart
    const monthlyCtx = document.getElementById('monthlyImpactChart');
    if (monthlyCtx) {
        new Chart(monthlyCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Trees Planted',
                    data: [12, 19, 25, 22, 30, 35],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Plastic Recycled (kg)',
                    data: [5, 8, 12, 15, 18, 22],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'CO₂ Saved (kg)',
                    data: [25, 35, 45, 55, 65, 75],
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Impact Distribution Chart
    const distributionCtx = document.getElementById('impactDistributionChart');
    if (distributionCtx) {
        new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Trees Planted', 'Plastic Recycled', 'CO₂ Saved', 'Water Saved'],
                datasets: [{
                    data: [30, 25, 25, 20],
                    backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
    
    // College Comparison Chart
    const comparisonCtx = document.getElementById('collegeComparisonChart');
    if (comparisonCtx) {
        new Chart(comparisonCtx, {
            type: 'bar',
            data: {
                labels: ['Green Valley Univ', 'Tech Institute', 'State University', 'Central College', 'Community College'],
                datasets: [{
                    label: 'Trees Planted',
                    data: [45, 38, 32, 28, 22],
                    backgroundColor: '#10B981'
                }, {
                    label: 'Plastic Recycled (kg)',
                    data: [15.5, 12.8, 11.2, 9.8, 8.1],
                    backgroundColor: '#3B82F6'
                }, {
                    label: 'CO₂ Saved (kg)',
                    data: [85, 72, 68, 54, 41],
                    backgroundColor: '#8B5CF6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// Event Listeners
function initializeEventListeners() {
    // Next/Previous quiz buttons
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('previousBtn').addEventListener('click', previousQuestion);
    
    // Contact form
    document.getElementById('contactForm').addEventListener('submit', function(e) {
        e.preventDefault();
        showSuccessMessage('Thank you for your interest! We will get back to you soon.');
        this.reset();
    });
}

// Utility Functions
function getDifficultyColor(difficulty) {
    const colors = {
        'Easy': 'green',
        'Medium': 'yellow',
        'Hard': 'red',
        'Beginner': 'green',
        'Intermediate': 'yellow',
        'Advanced': 'red'
    };
    return colors[difficulty] || 'gray';
}

function getRankColor(index) {
    if (index === 0) return 'bg-yellow-500';
    if (index === 1) return 'bg-gray-400';
    if (index === 2) return 'bg-yellow-600';
    return 'bg-gray-300';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

function showSuccessMessage(message) {
    // Create and show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showInfoMessage(message) {
    // Create and show info toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-x-full');
    }, 100);
    
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function renderFallbackLeaderboard() {
    // Fallback leaderboard data
    const fallbackUsers = [
        { name: "Alex Chen", college: "Green Valley University", xp_points: 1250, level: 5, badges: ["Eco Warrior", "Tree Hugger"], avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" },
        { name: "Sarah Johnson", college: "Tech Institute", xp_points: 980, level: 4, badges: ["Recycling Champion"], avatar_url: "https://images.unsplash.com/photo-1494790108755-2616b612b029?w=150&h=150&fit=crop&crop=face" },
        { name: "Mike Rodriguez", college: "State University", xp_points: 1500, level: 6, badges: ["Eco Warrior", "Climate Champion"], avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" }
    ];

    renderGlobalLeaderboard(fallbackUsers.sort((a, b) => b.xp_points - a.xp_points));
}

// Chatbot Functions
function initializeChatbot() {
    const chatbotIcon = document.getElementById('chatbotIcon');
    const chatbotWindow = document.getElementById('chatbotWindow');
    const closeChatbot = document.getElementById('closeChatbot');
    const sendMessage = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');

    // Toggle chatbot window
    chatbotIcon.addEventListener('click', function() {
        chatbotWindow.classList.toggle('hidden');
    });

    // Close chatbot
    closeChatbot.addEventListener('click', function() {
        chatbotWindow.classList.add('hidden');
    });

    // Send message on button click
    sendMessage.addEventListener('click', function() {
        sendChatMessage();
    });

    // Send message on Enter key
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();

    if (message === '') return;

    // Add user message to chat
    addMessageToChat(message, 'user');

    // Clear input
    chatInput.value = '';

    // Simulate typing indicator
    showTypingIndicator();

    // Get bot response after delay
    setTimeout(() => {
        hideTypingIndicator();
        const response = getBotResponse(message);
        addMessageToChat(response, 'bot');
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `flex items-start space-x-3 ${sender === 'user' ? 'justify-end' : ''}`;

    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="bg-green-500 text-white rounded-2xl rounded-tr-md p-3 max-w-xs">
                <p class="text-sm">${message}</p>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-leaf text-green-600 text-sm"></i>
            </div>
            <div class="bg-gray-100 rounded-2xl rounded-tl-md p-3 max-w-xs">
                <p class="text-gray-800 text-sm">${message}</p>
            </div>
        `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');

    const typingDiv = document.createElement('div');
    typingDiv.id = 'typingIndicator';
    typingDiv.className = 'flex items-start space-x-3';

    typingDiv.innerHTML = `
        <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-leaf text-green-600 text-sm"></i>
        </div>
        <div class="bg-gray-100 rounded-2xl rounded-tl-md p-3">
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            </div>
        </div>
    `;

    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function getBotResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Define responses based on keywords
    const responses = {
        // EcoLearn specific
        'what is ecolearn': 'EcoLearn is a gamified environmental education platform that helps students learn about sustainability through challenges, quizzes, and real-world impact tracking.',
        'how do i join challenges': 'To join challenges, first log in to your account, then browse the challenges section and click "Join Challenge" on any challenge you\'re interested in.',
        'what are the benefits': 'Environmental education helps you understand climate change, sustainability, and how to protect our planet. It also earns you XP and badges on EcoLearn!',
        'how do i earn xp': 'You earn XP by completing challenges, taking quizzes, and participating in environmental activities on EcoLearn.',
        'what are badges': 'Badges are achievements you earn for completing specific challenges or reaching milestones. They showcase your environmental commitment.',
        'what is the dashboard': 'The dashboard shows your progress, XP, level, badges, environmental impact, and recent activity.',
        'how does the leaderboard work': 'The leaderboard ranks students and colleges based on XP earned from challenges and quizzes. It encourages friendly competition.',
        'how do i create an account': 'To create an account, click the "Sign Up" button and fill in your details including your name, college, and email address.',
        'how do i log in': 'Click the login button in the top right corner and enter your email and password.',
        'what is my level': 'Your level is determined by your total XP points. Every 500 XP advances you to the next level.',
        'how do i view my progress': 'Check your dashboard to see your current level, XP points, badges earned, and recent activities.',
        'can i compete with friends': 'Yes! The leaderboard shows rankings among all students, and you can challenge your friends to complete more activities.',
        'what happens when i complete a challenge': 'You earn XP points, unlock badges, and contribute to your college\'s environmental impact score.',
        'how do i take a quiz': 'Browse the quizzes section, select a quiz that interests you, and click "Start Quiz" to begin.',
        'what if i run out of time on a quiz': 'The quiz will automatically submit when time runs out, and you\'ll receive points for the questions you answered correctly.',
        'can i retake a quiz': 'Yes, you can retake quizzes to improve your score and earn more XP points.',
        'how do i contact support': 'You can reach out through the contact form on our website or email us at support@ecolearn.edu.',
        // Additional common questions and answers
        'what is climate change': 'Climate change refers to long-term shifts in temperatures and weather patterns, mainly caused by human activities like burning fossil fuels.',
        'how can i reduce my carbon footprint': 'You can reduce your carbon footprint by using public transport, recycling, conserving energy, and supporting renewable energy sources.',
        'what is sustainability': 'Sustainability means meeting our needs without compromising the ability of future generations to meet theirs.',
        'how do i recycle properly': 'Recycle clean and dry materials, separate recyclables according to local guidelines, and avoid contaminating recycling bins.',
        'why is biodiversity important': 'Biodiversity supports ecosystem health, provides food and medicine, and helps regulate the climate.',
        'what are renewable energy sources': 'Renewable energy sources include solar, wind, hydro, geothermal, and biomass energy.',
        'how does recycling help the environment': 'Recycling reduces waste, conserves natural resources, saves energy, and decreases pollution.',
        'what is global warming': 'Global warming is the increase in Earth\'s average surface temperature due to greenhouse gas emissions.',
        'how can i save water at home': 'Fix leaks, take shorter showers, use water-efficient appliances, and collect rainwater for gardening.',
        'what is composting': 'Composting is the process of recycling organic waste into nutrient-rich soil for gardening.',
        'how do i reduce plastic use': 'Use reusable bags, bottles, and containers, avoid single-use plastics, and support plastic-free products.',
        'what is the greenhouse effect': 'The greenhouse effect is the trapping of heat in the Earth\'s atmosphere by greenhouse gases, warming the planet.',
        'how can i get involved in environmental activism': 'Join local groups, participate in cleanups, advocate for policies, and educate others about environmental issues.',
        'what is deforestation': 'Deforestation is the clearing of forests for agriculture, logging, or development, leading to habitat loss and climate change.',
        'how do trees help the environment': 'Trees absorb CO2, produce oxygen, prevent soil erosion, and provide habitat for wildlife.',
        'what is air pollution': 'Air pollution is the presence of harmful substances in the air that can affect health and the environment.',
        'how can i reduce energy consumption': 'Turn off lights and electronics when not in use, use energy-efficient appliances, and insulate your home.',
        'what is a carbon footprint': 'A carbon footprint measures the total greenhouse gas emissions caused directly or indirectly by an individual or organization.',
        'how do i support sustainable agriculture': 'Buy local and organic produce, reduce meat consumption, and support farmers who use sustainable practices.',
        'what is environmental justice': 'Environmental justice ensures that all communities have equal protection from environmental hazards and equal access to decision-making.',
        'how can i learn more about climate change': 'Read scientific reports, follow reputable organizations, take courses, and participate in educational programs like EcoLearn.',
        'what is ocean acidification': 'Ocean acidification is the decrease in ocean pH caused by absorption of excess CO2, harming marine life.',
        'how do wetlands benefit the environment': 'Wetlands filter pollutants, provide habitat, reduce flooding, and store carbon.',
        'what is the importance of pollinators': 'Pollinators like bees and butterflies are essential for plant reproduction and food production.',
        'how can i reduce waste': 'Practice the 3 Rs: Reduce, Reuse, Recycle. Avoid disposable products and compost organic waste.',
        'what is climate change adaptation': 'Adaptation involves adjusting practices and infrastructure to minimize harm from climate change impacts.',
        'how do electric vehicles help the environment': 'They reduce greenhouse gas emissions and air pollution compared to gasoline vehicles.',
        'what is sustainable development': 'Development that meets present needs without compromising future generations\' ability to meet theirs.',
        'how can I participate in citizen science': 'Join projects that collect environmental data, such as bird counts or water quality monitoring.',
        'what is the Paris Agreement': 'An international treaty aiming to limit global warming to below 2°C above pre-industrial levels.',
        'how do I reduce my energy bills': 'Use energy-efficient appliances, seal leaks, use programmable thermostats, and switch to LED lighting.',
        'what is zero waste lifestyle': 'A lifestyle that aims to send no waste to landfills by reducing, reusing, and recycling.',
        'how do I start a community garden': 'Find a location, gather community support, plan the garden, and start planting sustainable crops.',
        'what is the role of forests in climate regulation': 'Forests absorb CO2, regulate water cycles, and maintain biodiversity.',
        'how can I conserve water in my garden': 'Use drip irrigation, mulch plants, and water during cooler parts of the day.',
        'what is the impact of plastic pollution': 'Plastic pollution harms wildlife, contaminates food chains, and pollutes ecosystems.',
        'how do I reduce food waste': 'Plan meals, store food properly, use leftovers, and compost scraps.',
        'what is the circular economy': 'An economic system aimed at eliminating waste and continual use of resources through reuse and recycling.',
        'how can I support renewable energy': 'Install solar panels, choose green energy providers, and advocate for clean energy policies.',
        'what is environmental policy': 'Laws and regulations designed to protect the environment and promote sustainability.',
        'how do I get involved in local environmental groups': 'Search online, attend meetings, volunteer for events, and connect with like-minded people.',
        'what is the importance of bees': 'Bees pollinate plants, supporting food production and biodiversity.',
        'how can I reduce my carbon footprint while traveling': 'Use public transport, carpool, choose eco-friendly accommodations, and offset emissions.',
        'what is sustainable fashion': 'Clothing produced in environmentally and socially responsible ways.',
        'how do I recycle electronics': 'Take them to certified e-waste recycling centers or participate in take-back programs.',
        'what is the impact of deforestation on wildlife': 'Loss of habitat, decreased biodiversity, and increased risk of extinction.',
        'how can I reduce paper waste': 'Go digital, reuse scrap paper, and recycle used paper products.',
        'what is the importance of wetlands': 'Wetlands provide habitat, filter water, and protect against floods.',
        'how do I compost at home': 'Collect organic waste, maintain moisture and aeration, and turn the pile regularly.',
        'what is the impact of climate change on oceans': 'Rising temperatures, acidification, sea level rise, and loss of marine species.',
        'how can I support conservation efforts': 'Donate, volunteer, spread awareness, and practice sustainable living.',
        'what is the role of education in sustainability': 'Educates people to make informed decisions and take responsible actions.',
        'how do I reduce energy use in winter': 'Seal drafts, use energy-efficient heating, and wear warm clothing indoors.',
        'what is the impact of air pollution on health': 'Respiratory diseases, heart problems, and increased mortality rates.',
        'how can I reduce single-use plastics': 'Use reusable bags, bottles, straws, and avoid products with excessive packaging.',
        'what is the importance of trees in urban areas': 'Provide shade, improve air quality, reduce heat island effect, and enhance wellbeing.',
        'how do I participate in tree planting': 'Join local tree planting events or organize your own community initiative.',
        'what is the impact of climate change on agriculture': 'Reduced crop yields, altered growing seasons, and increased pests and diseases.',
        'how can I reduce water pollution': 'Properly dispose of chemicals, reduce plastic use, and support clean water initiatives.',
        'what is the importance of soil health': 'Supports plant growth, stores carbon, and maintains ecosystem functions.',
        'how do I reduce my waste footprint': 'Avoid disposable products, recycle, compost, and buy in bulk.',
        'what is the impact of overfishing': 'Depletion of fish stocks, disruption of marine ecosystems, and loss of livelihoods.',
        'how can I support sustainable seafood': 'Choose certified sustainable seafood and avoid overfished species.',
        'what is the role of wetlands in carbon storage': 'Wetlands store large amounts of carbon, helping mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment when not in use, use energy-efficient devices, and encourage green practices.',
        'what is the impact of light pollution': 'Disrupts ecosystems, affects human health, and wastes energy.',
        'how can I reduce light pollution': 'Use outdoor lighting only when necessary, shield lights, and use energy-efficient bulbs.',
        'what is the importance of pollinators in food production': 'Pollinators are essential for the reproduction of many crops and wild plants.',
        'how do I reduce my plastic footprint': 'Avoid single-use plastics, recycle properly, and support plastic-free alternatives.',
        'what is the impact of climate change on wildlife': 'Habitat loss, altered migration patterns, and increased extinction risk.',
        'how can I support wildlife conservation': 'Donate, volunteer, reduce habitat destruction, and support protected areas.',
        'what is the role of oceans in climate regulation': 'Oceans absorb CO2, regulate temperature, and support biodiversity.',
        'how do I reduce my energy use in summer': 'Use fans, close blinds, use energy-efficient cooling, and unplug electronics.',
        'what is the impact of noise pollution': 'Stress, hearing loss, and disruption of wildlife communication.',
        'how can I reduce noise pollution': 'Use quieter equipment, limit loud activities, and support noise regulations.',
        'what is the importance of environmental laws': 'Protect natural resources, regulate pollution, and promote sustainable development.',
        'how do I get involved in environmental policy': 'Advocate, vote, participate in public consultations, and join environmental organizations.',
        'what is the impact of plastic on marine life': 'Ingestion, entanglement, and habitat degradation.',
        'how can I reduce my carbon emissions': 'Use public transport, reduce energy use, eat plant-based, and support clean energy.',
        'what is the importance of wetlands for flood control': 'Wetlands absorb excess water, reducing flood risks.',
        'how do I reduce my water footprint': 'Fix leaks, use water-efficient appliances, and reduce water-intensive products.',
        'what is the impact of climate change on human health': 'Increased heat stress, spread of diseases, and food insecurity.',
        'how can I support environmental education': 'Share knowledge, participate in programs, and support schools and organizations.',
        'what is the role of technology in sustainability': 'Improves efficiency, monitors environment, and supports clean energy.',
        'how do I reduce my waste at school': 'Use reusable containers, recycle, and participate in waste reduction programs.',
        'what is the impact of urbanization on the environment': 'Habitat loss, pollution, and increased resource consumption.',
        'how can I support sustainable transportation': 'Use public transit, bike, walk, and support electric vehicles.',
        'what is the importance of wetlands for biodiversity': 'Provide habitat for many species and support ecosystem services.',
        'how do I reduce my energy use in transportation': 'Carpool, use fuel-efficient vehicles, and reduce unnecessary trips.',
        'what is the impact of climate change on water resources': 'Altered precipitation, droughts, and water scarcity.',
        'how can I support renewable energy policies': 'Advocate, vote, and support organizations promoting clean energy.',
        'what is the importance of environmental monitoring': 'Tracks changes, informs policy, and supports conservation efforts.',
        'how do I reduce my paper use': 'Go digital, reuse paper, and recycle.',
        'what is the impact of climate change on forests': 'Increased fires, pests, and altered growth patterns.',
        'how can I support sustainable forestry': 'Buy certified products and support conservation initiatives.',
        'what is the role of education in climate action': 'Raises awareness, builds skills, and motivates behavior change.',
        'how do I reduce my plastic use at work': 'Use reusable containers, avoid single-use plastics, and recycle properly.',
        'what is the impact of climate change on oceans': 'Rising temperatures, acidification, and sea level rise.',
        'how can I support ocean conservation': 'Reduce plastic use, support marine protected areas, and participate in cleanups.',
        'what is the importance of wetlands for water quality': 'Filter pollutants and improve water quality.',
        'how do I reduce my energy use in the kitchen': 'Use energy-efficient appliances and cook efficiently.',
        'what is the impact of climate change on agriculture': 'Reduced yields, altered growing seasons, and increased pests.',
        'how can I support sustainable agriculture': 'Buy local, organic, and support farmers using sustainable practices.',
        'what is the role of community in sustainability': 'Encourages collective action and supports local solutions.',
        'how do I reduce my waste in the bathroom': 'Use reusable products and recycle packaging.',
        'what is the impact of climate change on wildlife migration': 'Disrupted patterns and habitat loss.',
        'how can I support wildlife habitats': 'Protect natural areas and reduce pollution.',
        'what is the importance of wetlands for carbon storage': 'Store large amounts of carbon, helping mitigate climate change.',
        'how do I reduce my energy use in lighting': 'Use LED bulbs and turn off lights when not needed.',
        'what is the impact of climate change on human communities': 'Increased disasters, health risks, and displacement.',
        'how can I support climate resilience': 'Prepare communities and support adaptation efforts.',
        'what is the role of policy in environmental protection': 'Sets rules and incentives to protect the environment.',
        'how do I reduce my water use in landscaping': 'Use native plants and efficient irrigation.',
        'what is the impact of climate change on oceans': 'Rising temperatures, acidification, and sea level rise.',
        'how can I support ocean health': 'Reduce pollution and support conservation efforts.',
        'what is the importance of wetlands for wildlife': 'Provide critical habitat and breeding grounds.',
        'how do I reduce my energy use in heating': 'Insulate your home and use efficient heating systems.',
        'what is the impact of climate change on food security': 'Reduced crop yields and increased hunger.',
        'how can I support food security': 'Support sustainable agriculture and reduce food waste.',
        'what is the role of individuals in sustainability': 'Every action counts towards a healthier planet.',
        'how do I reduce my waste in packaging': 'Choose products with minimal packaging and reuse containers.',
        'what is the impact of climate change on water quality': 'Increased pollution and altered water cycles.',
        'how can I support clean water initiatives': 'Advocate and support organizations working on water issues.',
        'what is the importance of wetlands for flood mitigation': 'Absorb excess water and reduce flood risks.',
        'how do I reduce my energy use in appliances': 'Use energy-efficient models and unplug when not in use.',
        'what is the impact of climate change on biodiversity': 'Loss of species and altered ecosystems.',
        'how can I support biodiversity conservation': 'Protect habitats and reduce pollution.',
        'what is the role of education in environmental stewardship': 'Builds knowledge and encourages responsible behavior.',
        'how do I reduce my plastic use in daily life': 'Use reusable items and avoid single-use plastics.',
        'what is the impact of climate change on human health': 'Increased heat stress and disease spread.',
        'how can I support public health and environment': 'Advocate for clean air and water policies.',
        'what is the importance of wetlands for ecosystem services': 'Provide water filtration, habitat, and flood control.',
        'how do I reduce my energy use in transportation': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Rising temperatures and acidification.',
        'how can I support marine biodiversity': 'Reduce pollution and support marine protected areas.',
        'what is the importance of wetlands for carbon sequestration': 'Store carbon and help mitigate climate change.',
        'how do I reduce my energy use in office': 'Turn off equipment and use energy-efficient devices.',
        'what is the impact of climate change on agriculture': 'Reduced yields and altered growing seasons.',
        'how can I support sustainable farming': 'Buy local and organic products.',
        'what is the role of community in environmental action': 'Mobilizes collective efforts for change.',
        'how do I reduce my waste in packaging': 'Choose minimal packaging and reuse containers.',
        'what is the impact of climate change on wildlife': 'Habitat loss and altered migration.',
        'how can I support wildlife protection': 'Protect habitats and reduce pollution.',
        'what is the importance of wetlands for water purification': 'Filter pollutants and improve water quality.',
        'how do I reduce my energy use in lighting': 'Use LED bulbs and turn off lights.',
        'what is the impact of climate change on human communities': 'Increased disasters and displacement.',
        'how can I support climate adaptation': 'Prepare communities and support policies.',
        'what is the role of policy in sustainability': 'Creates frameworks for environmental protection.',
        'how do I reduce my water use in gardening': 'Use efficient irrigation and native plants.',
        'what is the impact of climate change on oceans': 'Rising temperatures and sea level rise.',
        'how can I support ocean conservation': 'Reduce pollution and support marine parks.',
        'what is the importance of wetlands for wildlife habitat': 'Provide breeding and feeding grounds.',
        'how do I reduce my energy use in heating': 'Insulate and use efficient systems.',
        'what is the impact of climate change on food security': 'Reduced crop yields and hunger.',
        'how can I support food sustainability': 'Reduce waste and support local farms.',
        'what is the role of individuals in environmental protection': 'Every action contributes to change.',
        'how do I reduce my waste in packaging': 'Choose reusable and minimal packaging.',
        'what is the impact of climate change on water resources': 'Altered availability and quality.',
        'how can I support clean water access': 'Advocate and support water projects.',
        'what is the importance of wetlands for flood control': 'Absorb water and reduce flooding.',
        'how do I reduce my energy use in appliances': 'Use efficient models and unplug.',
        'what is the impact of climate change on biodiversity': 'Species loss and ecosystem changes.',
        'how can I support biodiversity': 'Protect habitats and reduce pollution.',
        'what is the role of education in sustainability': 'Builds awareness and skills.',
        'how do I reduce my plastic use daily': 'Use reusable items and avoid disposables.',
        'what is the impact of climate change on health': 'Increased heat and disease risks.',
        'how can I support health and environment': 'Advocate for clean air and water.',
        'what is the importance of wetlands for ecosystems': 'Provide services like filtration and habitat.',
        'how do I reduce my energy use in transport': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Warming and acidification.',
        'how can I support marine life': 'Reduce pollution and protect habitats.',
        'what is the importance of wetlands for carbon storage': 'Store carbon and mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment and use efficient devices.',
        'what is the impact of climate change on farming': 'Reduced yields and pests.',
        'how can I support sustainable agriculture': 'Buy local and organic.',
        'what is the role of community in environment': 'Mobilizes collective action.',
        'how do I reduce my waste in packaging': 'Choose minimal and reusable packaging.',
        'what is the impact of climate change on wildlife': 'Habitat loss and migration changes.',
        'how can I support wildlife': 'Protect habitats and reduce pollution.',
        'what is the importance of wetlands for water quality': 'Filter pollutants and improve water.',
        'how do I reduce my energy use in lighting': 'Use LEDs and turn off lights.',
        'what is the impact of climate change on communities': 'Disasters and displacement.',
        'how can I support climate resilience': 'Prepare and support policies.',
        'what is the role of policy in environment': 'Sets rules for protection.',
        'how do I reduce my water use in garden': 'Use efficient irrigation and plants.',
        'what is the impact of climate change on oceans': 'Warming and sea level rise.',
        'how can I support ocean health': 'Reduce pollution and protect areas.',
        'what is the importance of wetlands for wildlife': 'Provide habitat and breeding.',
        'how do I reduce my energy use in heating': 'Insulate and use efficient systems.',
        'what is the impact of climate change on food': 'Reduced yields and hunger.',
        'how can I support food security': 'Reduce waste and support farms.',
        'what is the role of individuals in sustainability': 'Every action matters.',
        'how do I reduce my waste in packaging': 'Choose reusable and minimal packaging.',
        'what is the impact of climate change on water': 'Altered availability and quality.',
        'how can I support clean water': 'Advocate and support projects.',
        'what is the importance of wetlands for flood': 'Absorb water and reduce floods.',
        'how do I reduce my energy use in appliances': 'Use efficient models and unplug.',
        'what is the impact of climate change on biodiversity': 'Species loss and changes.',
        'how can I support biodiversity': 'Protect habitats and reduce pollution.',
        'what is the role of education in sustainability': 'Builds awareness and skills.',
        'how do I reduce my plastic use daily': 'Use reusable items and avoid disposables.',
        'what is the impact of climate change on health': 'Increased heat and disease risks.',
        'how can I support health and environment': 'Advocate for clean air and water.',
        'what is the importance of wetlands for ecosystems': 'Provide services like filtration and habitat.',
        'how do I reduce my energy use in transport': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Warming and acidification.',
        'how can I support marine life': 'Reduce pollution and protect habitats.',
        'what is the importance of wetlands for carbon storage': 'Store carbon and mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment and use efficient devices.',
        'what is the impact of climate change on farming': 'Reduced yields and pests.',
        'how can I support sustainable agriculture': 'Buy local and organic.',
        'what is the role of community in environment': 'Mobilizes collective action.',
        'how do I reduce my waste in packaging': 'Choose minimal and reusable packaging.',
        'what is the impact of climate change on wildlife': 'Habitat loss and migration changes.',
        'how can I support wildlife': 'Protect habitats and reduce pollution.',
        'what is the importance of wetlands for water quality': 'Filter pollutants and improve water.',
        'how do I reduce my energy use in lighting': 'Use LEDs and turn off lights.',
        'what is the impact of climate change on communities': 'Disasters and displacement.',
        'how can I support climate resilience': 'Prepare and support policies.',
        'what is the role of policy in environment': 'Sets rules for protection.',
        'how do I reduce my water use in garden': 'Use efficient irrigation and plants.',
        'what is the impact of climate change on oceans': 'Warming and sea level rise.',
        'how can I support ocean health': 'Reduce pollution and protect areas.',
        'what is the importance of wetlands for wildlife': 'Provide habitat and breeding.',
        'how do I reduce my energy use in heating': 'Insulate and use efficient systems.',
        'what is the impact of climate change on food': 'Reduced yields and hunger.',
        'how can I support food security': 'Reduce waste and support farms.',
        'what is the role of individuals in sustainability': 'Every action matters.',
        'how do I reduce my waste in packaging': 'Choose reusable and minimal packaging.',
        'what is the impact of climate change on water': 'Altered availability and quality.',
        'how can I support clean water': 'Advocate and support projects.',
        'what is the importance of wetlands for flood': 'Absorb water and reduce floods.',
        'how do I reduce my energy use in appliances': 'Use efficient models and unplug.',
        'what is the impact of climate change on biodiversity': 'Species loss and changes.',
        'how can I support biodiversity': 'Protect habitats and reduce pollution.',
        'what is the role of education in sustainability': 'Builds awareness and skills.',
        'how do I reduce my plastic use daily': 'Use reusable items and avoid disposables.',
        'what is the impact of climate change on health': 'Increased heat and disease risks.',
        'how can I support health and environment': 'Advocate for clean air and water.',
        'what is the importance of wetlands for ecosystems': 'Provide services like filtration and habitat.',
        'how do I reduce my energy use in transport': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Warming and acidification.',
        'how can I support marine life': 'Reduce pollution and protect habitats.',
        'what is the importance of wetlands for carbon storage': 'Store carbon and mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment and use efficient devices.',
        'what is the impact of climate change on farming': 'Reduced yields and pests.',
        'how can I support sustainable agriculture': 'Buy local and organic.',
        'what is the role of community in environment': 'Mobilizes collective action.',
        'how do I reduce my waste in packaging': 'Choose minimal and reusable packaging.',
        'what is the impact of climate change on wildlife': 'Habitat loss and migration changes.',
        'how can I support wildlife': 'Protect habitats and reduce pollution.',
        'what is the importance of wetlands for water quality': 'Filter pollutants and improve water.',
        'how do I reduce my energy use in lighting': 'Use LEDs and turn off lights.',
        'what is the impact of climate change on communities': 'Disasters and displacement.',
        'how can I support climate resilience': 'Prepare and support policies.',
        'what is the role of policy in environment': 'Sets rules for protection.',
        'how do I reduce my water use in garden': 'Use efficient irrigation and plants.',
        'what is the impact of climate change on oceans': 'Warming and sea level rise.',
        'how can I support ocean health': 'Reduce pollution and protect areas.',
        'what is the importance of wetlands for wildlife': 'Provide habitat and breeding.',
        'how do I reduce my energy use in heating': 'Insulate and use efficient systems.',
        'what is the impact of climate change on food': 'Reduced yields and hunger.',
        'how can I support food security': 'Reduce waste and support farms.',
        'what is the role of individuals in sustainability': 'Every action matters.',
        'how do I reduce my waste in packaging': 'Choose reusable and minimal packaging.',
        'what is the impact of climate change on water': 'Altered availability and quality.',
        'how can I support clean water': 'Advocate and support projects.',
        'what is the importance of wetlands for flood': 'Absorb water and reduce floods.',
        'how do I reduce my energy use in appliances': 'Use efficient models and unplug.',
        'what is the impact of climate change on biodiversity': 'Species loss and changes.',
        'how can I support biodiversity': 'Protect habitats and reduce pollution.',
        'what is the role of education in sustainability': 'Builds awareness and skills.',
        'how do I reduce my plastic use daily': 'Use reusable items and avoid disposables.',
        'what is the impact of climate change on health': 'Increased heat and disease risks.',
        'how can I support health and environment': 'Advocate for clean air and water.',
        'what is the importance of wetlands for ecosystems': 'Provide services like filtration and habitat.',
        'how do I reduce my energy use in transport': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Warming and acidification.',
        'how can I support marine life': 'Reduce pollution and protect habitats.',
        'what is the importance of wetlands for carbon storage': 'Store carbon and mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment and use efficient devices.',
        'what is the impact of climate change on farming': 'Reduced yields and pests.',
        'how can I support sustainable agriculture': 'Buy local and organic.',
        'what is the role of community in environment': 'Mobilizes collective action.',
        'how do I reduce my waste in packaging': 'Choose minimal and reusable packaging.',
        'what is the impact of climate change on wildlife': 'Habitat loss and migration changes.',
        'how can I support wildlife': 'Protect habitats and reduce pollution.',
        'what is the importance of wetlands for water quality': 'Filter pollutants and improve water.',
        'how do I reduce my energy use in lighting': 'Use LEDs and turn off lights.',
        'what is the impact of climate change on communities': 'Disasters and displacement.',
        'how can I support climate resilience': 'Prepare and support policies.',
        'what is the role of policy in environment': 'Sets rules for protection.',
        'how do I reduce my water use in garden': 'Use efficient irrigation and plants.',
        'what is the impact of climate change on oceans': 'Warming and sea level rise.',
        'how can I support ocean health': 'Reduce pollution and protect areas.',
        'what is the importance of wetlands for wildlife': 'Provide habitat and breeding.',
        'how do I reduce my energy use in heating': 'Insulate and use efficient systems.',
        'what is the impact of climate change on food': 'Reduced yields and hunger.',
        'how can I support food security': 'Reduce waste and support farms.',
        'what is the role of individuals in sustainability': 'Every action matters.',
        'how do I reduce my waste in packaging': 'Choose reusable and minimal packaging.',
        'what is the impact of climate change on water': 'Altered availability and quality.',
        'how can I support clean water': 'Advocate and support projects.',
        'what is the importance of wetlands for flood': 'Absorb water and reduce floods.',
        'how do I reduce my energy use in appliances': 'Use efficient models and unplug.',
        'what is the impact of climate change on biodiversity': 'Species loss and changes.',
        'how can I support biodiversity': 'Protect habitats and reduce pollution.',
        'what is the role of education in sustainability': 'Builds awareness and skills.',
        'how do I reduce my plastic use daily': 'Use reusable items and avoid disposables.',
        'what is the impact of climate change on health': 'Increased heat and disease risks.',
        'how can I support health and environment': 'Advocate for clean air and water.',
        'what is the importance of wetlands for ecosystems': 'Provide services like filtration and habitat.',
        'how do I reduce my energy use in transport': 'Use public transit and carpool.',
        'what is the impact of climate change on oceans': 'Warming and acidification.',
        'how can I support marine life': 'Reduce pollution and protect habitats.',
        'what is the importance of wetlands for carbon storage': 'Store carbon and mitigate climate change.',
        'how do I reduce my energy use at work': 'Turn off equipment and use efficient devices.',
        'what is the impact of climate change on farming': 'Reduced yields and pests.',
        'how can I support sustainable agriculture': 'Buy local and organic.',
        'what is the role of community in environment': 'Mobilizes collective action.',
        'how do I reduce my waste in packaging': 'Choose minimal and reusable packaging.',
        'what is the impact of climate change on wildlife': 'Habitat loss and migration changes.',

        // Environmental topics
        'what is climate change': 'Climate change is the long-term alteration of temperature and typical weather patterns in a place. It\'s primarily caused by human activities like burning fossil fuels.',
        'how can i reduce my carbon footprint': 'You can reduce your carbon footprint by using public transport, recycling, eating less meat, conserving energy, and participating in EcoLearn challenges.',
        'what is sustainability': 'Sustainability is meeting our present needs without compromising future generations\' ability to meet theirs. It involves environmental, economic, and social balance.',
        'what is recycling': 'Recycling is the process of converting waste materials into new materials and objects. It helps reduce pollution and conserve natural resources.',
        'why is the environment important': 'A healthy environment is essential for human survival, biodiversity, and maintaining the balance of ecosystems that support life on Earth.',
        'what can i do to help the planet': 'You can help the planet by learning about environmental issues, participating in challenges, reducing waste, conserving resources, and spreading awareness.',
        'what is deforestation': 'Deforestation is the large-scale removal of forests, often for agriculture or development. It contributes to climate change and loss of biodiversity.',
        'what is biodiversity': 'Biodiversity is the variety of life on Earth, including plants, animals, and microorganisms. It\'s crucial for ecosystem health and human survival.',
        'what is renewable energy': 'Renewable energy comes from natural sources that replenish themselves, like solar, wind, hydro, and geothermal power.',
        'what is pollution': 'Pollution is the introduction of harmful substances into the environment. It can be air, water, soil, or noise pollution.',
        'what is global warming': 'Global warming is the increase in Earth\'s average surface temperature due to greenhouse gases trapping heat in the atmosphere.',
        'what is the greenhouse effect': 'The greenhouse effect is when greenhouse gases in the atmosphere trap heat from the sun, keeping Earth warm enough for life.',
        'what is conservation': 'Conservation is the protection and sustainable use of natural resources to prevent their depletion.',
        'what is an ecosystem': 'An ecosystem is a community of living organisms and their physical environment, interacting as a system.',
        'what is water conservation': 'Water conservation involves using water efficiently and avoiding waste to preserve this precious resource.',
        'what is air quality': 'Air quality refers to the condition of the air we breathe, affected by pollutants and their concentrations.',
        'what is soil erosion': 'Soil erosion is the wearing away of topsoil by water, wind, or human activities, which can lead to desertification.',
        'what is composting': 'Composting is the process of decomposing organic matter to create nutrient-rich soil amendment.',
        'what is a carbon footprint': 'A carbon footprint is the total amount of greenhouse gases emitted by an individual, organization, or product over its lifetime.',
        'what is environmental justice': 'Environmental justice is the fair treatment and meaningful involvement of all people in environmental decision-making.',
        'what is sustainable development': 'Sustainable development meets present needs without compromising future generations\' ability to meet theirs.',
        'what is a wetland': 'A wetland is an area where water covers the soil, either permanently or seasonally, supporting unique plant and animal life.',
        'what is reforestation': 'Reforestation is the process of planting trees in areas where forests have been cut down or destroyed.',
        'what is ocean acidification': 'Ocean acidification occurs when the ocean absorbs CO2 from the atmosphere, making it more acidic and harming marine life.',
        'what is a food web': 'A food web shows how energy flows through an ecosystem through feeding relationships between organisms.',
        'what is habitat loss': 'Habitat loss occurs when natural areas are destroyed or altered, forcing wildlife to find new places to live.',
        'what is invasive species': 'Invasive species are non-native organisms that cause harm to ecosystems, economies, or human health.',
        'what is the ozone layer': 'The ozone layer is a region of Earth\'s stratosphere that absorbs most of the sun\'s ultraviolet radiation.',
        'what is eutrophication': 'Eutrophication is the enrichment of water bodies with nutrients, leading to excessive algae growth and oxygen depletion.',
        'what is a keystone species': 'A keystone species has a disproportionately large effect on its environment relative to its abundance.',
        'what is biomimicry': 'Biomimicry is the practice of learning from and imitating nature\'s designs and processes to solve human problems.',

        // General
        'hello': 'Hello! How can I help you learn about environmental topics today?',
        'hi': 'Hi there! I\'m here to answer your questions about EcoLearn and environmental education.',
        'help': 'I can help you with information about EcoLearn, environmental topics, sustainability, and how to make a positive impact on our planet!',
        'thank you': 'You\'re welcome! Keep learning and making a difference for our planet.',
        'thanks': 'You\'re welcome! Remember, every small action counts towards a sustainable future.',
        'goodbye': 'Goodbye! Don\'t forget to complete some challenges today to help the environment!',
        'bye': 'Bye! Keep up the great work for our planet!',
        'how are you': 'I\'m doing great, thanks for asking! I\'m here and ready to help you learn about environmental topics.',
        'what can you do': 'I can answer questions about EcoLearn, environmental science, sustainability, and provide tips for living more eco-friendly.',
        'tell me a fact': 'Did you know that a single tree can absorb up to 48 pounds of CO2 per year? Plant more trees to help combat climate change!',
        'what\'s new': 'EcoLearn is always adding new challenges and quizzes. Check out the latest environmental topics and join the community!',
        'who created you': 'I was created by the EcoLearn team to help students learn about environmental education and sustainability.',
        'what is your purpose': 'My purpose is to educate and inspire students about environmental issues and encourage sustainable living through EcoLearn.',
        'can you help me': 'Absolutely! I can help you with EcoLearn features, environmental knowledge, and tips for making a positive impact.',
        'i need help': 'I\'m here to help! What would you like to know about EcoLearn or environmental topics?',
        'what should i do': 'Start by exploring EcoLearn challenges, taking quizzes, and learning about sustainability. Every action counts!',
        'how do i start': 'Begin by creating an account on EcoLearn, then explore the challenges and quizzes to start earning XP and making a difference.',
        'what\'s the best challenge': 'All challenges are great! Try the "Plant a Tree Challenge" to make an immediate environmental impact.',
        'how do i save energy': 'Save energy by turning off lights when not in use, using LED bulbs, unplugging electronics, and using energy-efficient appliances.',
        'how do i save water': 'Save water by taking shorter showers, fixing leaks, using water-efficient fixtures, and collecting rainwater for plants.',
        'what is zero waste': 'Zero waste is a philosophy that encourages reducing waste through responsible consumption and mindful living.',
        'how do i reduce plastic use': 'Reduce plastic use by using reusable bags, bottles, and containers, avoiding single-use plastics, and choosing products with minimal packaging.',
        'what is upcycling': 'Upcycling is the process of transforming waste materials into new products of better quality or environmental value.',
        'how do i volunteer': 'You can volunteer for environmental causes through local cleanups, tree planting, wildlife conservation, or EcoLearn community events.',
        'what is green living': 'Green living involves making environmentally conscious choices in daily life, from reducing waste to conserving energy and water.',
        'how do i go green': 'Go green by recycling, conserving resources, choosing sustainable products, and educating yourself about environmental issues.',
        'what is eco-friendly': 'Eco-friendly refers to products, practices, or lifestyles that are not harmful to the environment.',
        'how do i be more sustainable': 'Be more sustainable by reducing consumption, reusing items, recycling waste, and supporting environmentally responsible companies.',
        'what is the circular economy': 'The circular economy is an economic system aimed at eliminating waste and the continual use of resources through reuse and recycling.',
        'how do i calculate my carbon footprint': 'You can calculate your carbon footprint using online tools that consider your transportation, diet, energy use, and consumption habits.',
        'what is carbon neutral': 'Carbon neutral means that the total amount of carbon dioxide emissions produced is balanced by an equivalent amount removed or offset.',
        'how do i offset my carbon': 'Offset your carbon by supporting reforestation projects, renewable energy initiatives, or purchasing carbon credits.',
        'what is a green job': 'A green job is a position in businesses that produce goods or provide services that benefit the environment or conserve natural resources.',
        'how do i find green jobs': 'Look for jobs in renewable energy, conservation, sustainable agriculture, environmental consulting, and green technology sectors.',
        'what is environmental education': 'Environmental education teaches people about environmental issues, sustainability, and how to live in harmony with nature.',
        'why is environmental education important': 'Environmental education is crucial for creating informed citizens who can make sustainable decisions and protect our planet.',
        'how do i teach others': 'Share what you learn on EcoLearn, organize environmental activities, and encourage friends and family to participate in challenges.',
        'what is citizen science': 'Citizen science involves public participation in scientific research, often through data collection and monitoring environmental conditions.',
        'how do i get involved in citizen science': 'Join citizen science projects through apps and websites that track wildlife, monitor air/water quality, or study climate patterns.',
        'what is environmental policy': 'Environmental policy refers to government actions and regulations designed to protect the environment and promote sustainability.',
        'how do i influence policy': 'Influence policy by voting for environmentally conscious candidates, contacting representatives, and supporting environmental organizations.',
        'what is the paris agreement': 'The Paris Agreement is an international treaty on climate change that aims to limit global warming to well below 2°C above pre-industrial levels.',
        'what is cop': 'COP stands for Conference of the Parties, the supreme decision-making body of the United Nations Framework Convention on Climate Change.',
        'what is the ipcc': 'The IPCC is the Intergovernmental Panel on Climate Change, which provides scientific assessments on climate change for policymakers.',
        'what is the un sdg': 'The UN Sustainable Development Goals are 17 global goals adopted by the United Nations to address the world\'s biggest challenges by 2030.',
        'what is goal 13': 'SDG 13 is about Climate Action - taking urgent action to combat climate change and its impacts.',
        'what is goal 12': 'SDG 12 is about Responsible Consumption and Production - ensuring sustainable consumption and production patterns.',
        'what is goal 7': 'SDG 7 is about Affordable and Clean Energy - ensuring access to affordable, reliable, sustainable, and modern energy for all.',
        'what is goal 6': 'SDG 6 is about Clean Water and Sanitation - ensuring availability and sustainable management of water and sanitation for all.',
        'what is goal 3': 'SDG 3 is about Good Health and Well-being - ensuring healthy lives and promoting well-being for all at all ages.',
        'what is goal 15': 'SDG 15 is about Life on Land - protecting, restoring, and promoting sustainable use of terrestrial ecosystems.',
        'what is goal 14': 'SDG 14 is about Life Below Water - conserving and sustainably using the oceans, seas, and marine resources.',
        'what is goal 2': 'SDG 2 is about Zero Hunger - ending hunger, achieving food security, improving nutrition, and promoting sustainable agriculture.',
        'what is goal 1': 'SDG 1 is about No Poverty - ending poverty in all its forms everywhere.',
        'what is goal 4': 'SDG 4 is about Quality Education - ensuring inclusive and equitable quality education and promoting lifelong learning.',
        'what is goal 5': 'SDG 5 is about Gender Equality - achieving gender equality and empowering all women and girls.',
        'what is goal 8': 'SDG 8 is about Decent Work and Economic Growth - promoting sustained, inclusive, and sustainable economic growth.',
        'what is goal 9': 'SDG 9 is about Industry, Innovation, and Infrastructure - building resilient infrastructure and fostering innovation.',
        'what is goal 10': 'SDG 10 is about Reduced Inequalities - reducing inequality within and among countries.',
        'what is goal 11': 'SDG 11 is about Sustainable Cities and Communities - making cities and human settlements inclusive, safe, resilient, and sustainable.',
        'what is goal 16': 'SDG 16 is about Peace and Justice - promoting peaceful and inclusive societies for sustainable development.',
        'what is goal 17': 'SDG 17 is about Partnerships - strengthening the means of implementation and revitalizing the global partnership for sustainable development.'
    };

    // Check for exact matches first
    for (const [key, response] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            return response;
        }
    }

    // Check for partial matches
    if (lowerMessage.includes('ecolearn') || lowerMessage.includes('eco learn')) {
        return 'EcoLearn is an amazing platform for environmental education! What would you like to know about it?';
    }

    if (lowerMessage.includes('challenge')) {
        return 'Challenges are a great way to make real environmental impact! You can join challenges to plant trees, recycle, or learn about sustainability. What type of challenge interests you?';
    }

    if (lowerMessage.includes('quiz')) {
        return 'Quizzes are a fun way to test your environmental knowledge! You earn XP for completing them. Would you like to know more about our quiz topics?';
    }

    if (lowerMessage.includes('environment') || lowerMessage.includes('planet')) {
        return 'Protecting our environment is crucial! Small actions like recycling, conserving water, and reducing energy use can make a big difference. What environmental topic interests you most?';
    }

    if (lowerMessage.includes('sustainable') || lowerMessage.includes('sustainability')) {
        return 'Sustainability means meeting our needs today without compromising future generations. It involves environmental protection, economic viability, and social equity. What aspect of sustainability would you like to explore?';
    }

    // Default response
    return 'That\'s an interesting question! I\'m here to help with EcoLearn features and environmental education. Try asking about challenges, quizzes, sustainability, or climate change!';
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...

    // Initialize chatbot
    initializeChatbot();
});