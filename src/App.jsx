import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  ListTodo,
  Settings,
  Info,
  Trash2,
  ArrowDownAZ,
  ArrowUpZA,
  Activity,
  WifiOff,
} from 'lucide-react';

// --- 設定・データ定義 ---
const CRITERIA_KEYS = ['value', 'urgency', 'irreplaceability', 'relation', 'cost'];

const CRITERIA_INFO = {
  value: {
    title: '価値・リターン',
    desc: '重要度。社会のためになるか、お金に繋がるか、将来の資産やスキルになるか。',
    color: 'bg-blue-500',
    text: 'text-blue-600',
  },
  urgency: {
    title: '緊急度',
    desc: '期限の近さ。遅れた場合のペナルティの大きさ。高いほどすぐやるべき。',
    color: 'bg-red-500',
    text: 'text-red-600',
  },
  irreplaceability: {
    title: '代替不可能性',
    desc: '自分以外に代えが効くか。自分にしかできない、外注やAIに任せられないものほど高得点。',
    color: 'bg-purple-500',
    text: 'text-purple-600',
  },
  relation: {
    title: '関係資本',
    desc: '誰かに期待されているか、依頼主との関係性、友達からの頼み、今後も仕事をもらいたい相手か。',
    color: 'bg-pink-500',
    text: 'text-pink-600',
  },
  cost: {
    title: '手軽さ (低コスト)',
    desc: 'かかる時間や労力の少なさ。すぐ終わる、精神的負担が少ないものほど高得点（優先度アップ）。',
    color: 'bg-emerald-500',
    text: 'text-emerald-600',
  },
};

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('calculate'); // 'calculate', 'list', 'settings'
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // 現在入力中のタスク状態 (各項目1〜5点)
  const [currentTask, setCurrentTask] = useState({
    name: '',
    value: 3,
    urgency: 3,
    irreplaceability: 3,
    relation: 3,
    cost: 3,
  });

  // 重み設定 (0.5〜3.0倍) - 初期値をlocalStorageから取得
  const [weights, setWeights] = useState(() => {
    const savedWeights = localStorage.getItem('taskWeights');
    return savedWeights
      ? JSON.parse(savedWeights)
      : {
          value: 1.0,
          urgency: 1.5, // デフォルトで緊急度を少し高めに
          irreplaceability: 1.0,
          relation: 1.0,
          cost: 1.0,
        };
  });

  // 保存されたタスクリスト - 初期値をlocalStorageから取得
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('taskPriorityList');
    if (savedTasks) {
      // 日付文字列をDateオブジェクトに戻す
      return JSON.parse(savedTasks).map((task) => ({
        ...task,
        updatedAt: new Date(task.updatedAt),
      }));
    }
    return [];
  });

  // ソート設定
  const [sortConfig, setSortConfig] = useState({ key: 'totalScore', direction: 'desc' });

  // モーダル表示状態
  const [infoModalContent, setInfoModalContent] = useState(null);

  // スコアのアニメーション用State
  const [displayScore, setDisplayScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // --- オフライン検知 ---
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- データの永続化 (localStorage) ---
  // tasksが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('taskPriorityList', JSON.stringify(tasks));
  }, [tasks]);

  // weightsが変更されたらlocalStorageに保存
  useEffect(() => {
    localStorage.setItem('taskWeights', JSON.stringify(weights));
  }, [weights]);

  // --- ロジック ---
  // 総スコアの計算
  const calculateTotalScore = (taskScores, currentWeights) => {
    let total = 0;
    CRITERIA_KEYS.forEach((key) => {
      total += taskScores[key] * currentWeights[key];
    });
    return Number(total.toFixed(1));
  };

  const currentTotalScore = useMemo(() => {
    return calculateTotalScore(currentTask, weights);
  }, [currentTask, weights]);

  // スコアが変わった時のアニメーション処理
  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    setDisplayScore(currentTotalScore);
    return () => clearTimeout(timer);
  }, [currentTotalScore]);

  // タスクの保存
  const handleSaveTask = () => {
    if (!currentTask.name.trim()) return;

    const newTask = {
      id: Date.now().toString(),
      ...currentTask,
      totalScore: currentTotalScore,
      updatedAt: new Date(),
    };

    setTasks((prev) => [newTask, ...prev]);

    // 入力をリセット
    setCurrentTask({
      name: '',
      value: 3,
      urgency: 3,
      irreplaceability: 3,
      relation: 3,
      cost: 3,
    });
    setActiveTab('list');
  };

  const handleDeleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // ソート処理
  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = useMemo(() => {
    const sortableTasks = [...tasks];
    sortableTasks.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableTasks;
  }, [tasks, sortConfig]);

  // --- コンポーネント群 ---
  const formatDate = (date) => {
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(
      date.getMinutes(),
    ).padStart(2, '0')}`;
  };

  // 1. 計算タブ
  const renderCalculateTab = () => {
    // 緊急度による色とアニメーションのクラスを決定
    const isUrgent = currentTask.urgency >= 4;
    const scoreColorClass = isUrgent ? 'text-red-500' : 'text-indigo-600';
    const bgPulseClass = isUrgent
      ? 'animate-pulse bg-red-50 border-red-200'
      : 'bg-white border-indigo-100';

    return (
      <div className="p-4 space-y-6 pb-24">
        {/* スコア表示エリア */}
        <div
          className={`rounded-2xl border-2 p-6 text-center shadow-sm transition-all duration-300 ${bgPulseClass}`}
        >
          <h2 className="text-sm font-bold text-gray-500 mb-2 flex items-center justify-center gap-2">
            <Activity
              size={16}
              className={isUrgent ? 'text-red-500' : 'text-gray-400'}
            />
            リアルタイム優先度スコア
          </h2>
          <div
            className={`text-6xl font-black tabular-nums transition-transform duration-200 ${scoreColorClass} ${
              isAnimating ? 'scale-110' : 'scale-100'
            }`}
          >
            {displayScore}
          </div>
          {isUrgent && (
            <p className="text-xs font-bold text-red-500 mt-2">🔥 緊急タスクです！</p>
          )}
        </div>

        {/* 入力フォーム */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">タスク名</label>
            <input
              type="text"
              value={currentTask.name}
              onChange={(e) => setCurrentTask({ ...currentTask, name: e.target.value })}
              placeholder="例：A社へのプレゼン資料作成"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-5 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            {CRITERIA_KEYS.map((key) => {
              const info = CRITERIA_INFO[key];
              return (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${info.text}`}>{info.title}</span>
                      <button
                        onClick={() => setInfoModalContent(key)}
                        className="p-1 text-gray-400 hover:text-indigo-500 transition-colors rounded-full"
                      >
                        <Info size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded-md w-8 text-center">
                      {currentTask[key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={currentTask[key]}
                    onChange={(e) =>
                      setCurrentTask({ ...currentTask, [key]: Number(e.target.value) })
                    }
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-medium px-1">
                    <span>低い (1)</span>
                    <span>高い (5)</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSaveTask}
            disabled={!currentTask.name.trim()}
            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            <ListTodo size={20} />
            リストに登録する
          </button>
        </div>
      </div>
    );
  };

  // 2. タスクリストタブ
  const renderListTab = () => {
    return (
      <div className="p-4 space-y-4 pb-24 h-full flex flex-col">
        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-sm font-bold text-gray-700">並べ替え:</span>
          <select
            value={sortConfig.key}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm border-gray-300 rounded-lg bg-gray-50 p-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="totalScore">総合スコア</option>
            <option value="urgency">緊急度</option>
            <option value="value">価値・リターン</option>
            <option value="irreplaceability">代替不可能性</option>
            <option value="relation">関係資本</option>
            <option value="cost">手軽さ</option>
            <option value="updatedAt">追加日時</option>
          </select>
          <button
            onClick={() => handleSort(sortConfig.key)}
            className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {sortConfig.direction === 'desc' ? (
              <ArrowDownAZ size={18} />
            ) : (
              <ArrowUpZA size={18} />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {sortedTasks.length === 0 ? (
            <div className="text-center text-gray-400 mt-10 space-y-2">
              <ListTodo size={48} className="mx-auto opacity-20" />
              <p>
                タスクがありません。<br />
                計算タブから登録してください。
              </p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden"
              >
                {/* 緊急度が高い場合のアクセント線 */}
                {task.urgency >= 4 && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 pr-8">{task.name}</h3>
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-600 tabular-nums leading-none">
                      {task.totalScore}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">pts</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {CRITERIA_KEYS.map((key) => (
                    <span
                      key={key}
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${
                        CRITERIA_INFO[key].text
                      } border-current opacity-80`}
                    >
                      {CRITERIA_INFO[key].title.split(' ')[0]}: {task[key]}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-2 border-gray-100">
                  <span>更新: {formatDate(task.updatedAt)}</span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 3. 設定タブ
  const renderSettingsTab = () => {
    return (
      <div className="p-4 space-y-6 pb-24">
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-sm text-indigo-800 space-y-2">
          <p className="font-bold flex items-center gap-2">
            <Settings size={18} /> スコアの重み付け設定
          </p>
          <p className="text-xs opacity-80">
            あなたの現在の状況に合わせて、どの項目を重視するか（0.5倍〜3.0倍）を調整できます。忙しい時は「緊急度」や「代替不可能性」の倍率を上げるとより実践的なスコアになります。
          </p>
        </div>

        <div className="space-y-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          {CRITERIA_KEYS.map((key) => {
            const info = CRITERIA_INFO[key];
            return (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${info.text}`}>{info.title}</span>
                  <span className="text-sm font-black text-gray-700 bg-gray-100 px-2 py-1 rounded-md w-12 text-center">
                    x{weights[key].toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={weights[key]}
                  onChange={(e) => {
                    const newWeights = { ...weights, [key]: Number(e.target.value) };
                    setWeights(newWeights);
                    // 登録済みタスクのスコアも再計算する場合
                    const updatedTasks = tasks.map((t) => ({
                      ...t,
                      totalScore: calculateTotalScore(t, newWeights),
                    }));
                    setTasks(updatedTasks);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-700"
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- メインレンダー ---
  return (
    <div className="bg-gray-800 min-h-screen flex justify-center items-center font-sans">
      {/* スマホサイズコンテナ */}
      <div className="w-full max-w-md h-[100dvh] md:h-[850px] md:max-h-[90vh] bg-slate-50 relative flex flex-col md:rounded-3xl shadow-2xl overflow-hidden border-x md:border-y border-gray-700">
        {/* ヘッダー */}
        <header className="bg-white px-5 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h1 className="font-black text-lg text-gray-800 flex items-center gap-2">
            <Activity className="text-indigo-600" />
            Task Triage
          </h1>
        </header>

        {/* オフライン通知バナー */}
        {isOffline && (
          <div className="bg-amber-100 text-amber-800 text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
            <WifiOff size={14} />
            オフラインモード（データは端末に保存されます）
          </div>
        )}

        {/* メインコンテンツエリア (スクロール可) */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'calculate' && renderCalculateTab()}
          {activeTab === 'list' && renderListTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </main>

        {/* ボトムナビゲーション */}
        <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center pb-safe pt-1 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20 h-16">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'calculate'
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Calculator
              size={22}
              className={activeTab === 'calculate' ? 'fill-indigo-50' : ''}
            />
            <span className="text-[10px] font-bold">計算</span>
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative ${
              activeTab === 'list'
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className="relative">
              <ListTodo size={22} />
              {tasks.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">
                  {tasks.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold">リスト</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              activeTab === 'settings'
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Settings
              size={22}
              className={activeTab === 'settings' ? 'animate-[spin_4s_linear_infinite]' : ''}
            />
            <span className="text-[10px] font-bold">設定</span>
          </button>
        </nav>

        {/* Infoモーダル (ポップアップ) */}
        {infoModalContent && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform scale-100">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    CRITERIA_INFO[infoModalContent].color
                  } text-white`}
                >
                  <Info size={20} />
                </div>
                <h3
                  className={`font-black text-lg ${CRITERIA_INFO[infoModalContent].text}`}
                >
                  {CRITERIA_INFO[infoModalContent].title}
                </h3>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                {CRITERIA_INFO[infoModalContent].desc}
              </p>
              <button
                onClick={() => setInfoModalContent(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors active:scale-95"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

