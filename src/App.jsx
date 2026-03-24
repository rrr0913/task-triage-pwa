import React, { useState, useEffect, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import {
  Calculator,
  ListTodo,
  Settings,
  Info,
  Trash2,
  Archive,
  ChevronDown,
  CheckCircle2,
  ArrowDownAZ,
  ArrowUpZA,
  Activity,
  WifiOff,
} from 'lucide-react';

// --- 設定・データ定義 ---
const CRITERIA_KEYS = ['value', 'urgency', 'irreplaceability', 'relation', 'cost'];

const CRITERIA_INFO = {
  value: {
    title: 'リターン',
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
    title: '手軽さ',
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
        status: task.status ?? 'active',
        updatedAt: task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
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

  // リスト：左スワイプでアクションを表示しているタスク
  const [swipeRevealTaskId, setSwipeRevealTaskId] = useState(null);

  // 設定：アーカイブ/削除済み管理モーダルの表示状態
  const [settingsManageView, setSettingsManageView] = useState(
    /** @type {null | 'completed' | 'archived' | 'deleted'} */ (null),
  );

  // List：スワイプ中の追従用（なめらかさ向上）
  const [swipeDragTaskId, setSwipeDragTaskId] = useState(null);
  const [swipeDragDeltaX, setSwipeDragDeltaX] = useState(0);

  // List：タスク詳細編集モーダル
  const [editingTask, setEditingTask] = useState(null);

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
      status: 'active',
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

  const updateTaskStatus = (id, status) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              updatedAt: new Date(),
            }
          : t,
      ),
    );
    setSwipeRevealTaskId(null);
    setSwipeDragTaskId(null);
    setSwipeDragDeltaX(0);
  };

  const deleteTaskPermanently = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSwipeRevealTaskId(null);
    setSwipeDragTaskId(null);
    setSwipeDragDeltaX(0);
  };

  const openEditTask = (task) => {
    setSwipeRevealTaskId(null);
    setSwipeDragTaskId(null);
    setSwipeDragDeltaX(0);
    setEditingTask({
      ...task,
      updatedAt:
        task.updatedAt instanceof Date ? task.updatedAt : new Date(task.updatedAt),
    });
  };

  const handleSaveEditedTask = () => {
    if (!editingTask) return;
    if (!editingTask.name.trim()) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingTask.id
          ? {
              ...editingTask,
              name: editingTask.name.trim(),
              totalScore: calculateTotalScore(editingTask, weights),
              updatedAt: new Date(),
            }
          : t,
      ),
    );
    setEditingTask(null);
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
    const sortableTasks = tasks.filter((t) => t.status === 'active');
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

  const activeTaskCount = useMemo(
    () => tasks.filter((t) => t.status === 'active').length,
    [tasks],
  );

  // --- コンポーネント群 ---
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rgbToCss = (r, g, b) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  const lerpColor = (c1, c2, t) => {
    const r = lerp(c1[0], c2[0], t);
    const g = lerp(c1[1], c2[1], t);
    const b = lerp(c1[2], c2[2], t);
    return { r, g, b };
  };

  const formatDate = (date) => {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  // 1. 計算タブ
  const renderCalculateTab = () => {
    const minTotal = CRITERIA_KEYS.reduce((sum, key) => sum + 1 * weights[key], 0);
    const maxTotal = CRITERIA_KEYS.reduce((sum, key) => sum + 5 * weights[key], 0);
    const range = Math.max(0.0001, maxTotal - minTotal);
    const t = clamp01((displayScore - minTotal) / range);

    const blue = [79, 70, 229]; // indigo-600
    const yellow = [245, 158, 11]; // amber-500
    const red = [239, 68, 68]; // red-500

    const pick = t < 0.5 ? lerpColor(blue, yellow, t * 2) : lerpColor(yellow, red, (t - 0.5) * 2);
    const stroke = rgbToCss(pick.r, pick.g, pick.b);

    const fontSize = 60;

    return (
      <div className="p-4 flex flex-col h-full pb-20 gap-4 overflow-hidden">
        {/* スコア表示エリア */}
        <div className="flex-shrink-0 rounded-3xl border border-indigo-200 bg-white p-4 text-center shadow-sm transition-colors">
          <h2 className="text-sm font-bold text-gray-600 mb-2 flex items-center justify-center gap-2">
            <Activity size={16} className="text-indigo-600" />
            リアルタイム優先度スコア
          </h2>
          <div
            className="font-black tabular-nums leading-none"
            style={{
              fontSize,
              color: stroke,
              transition: 'color 450ms ease, transform 450ms ease',
              transform: isAnimating ? 'scale(1.04)' : 'scale(1)',
            }}
          >
            {displayScore}
          </div>
        </div>

        {/* 入力フォーム */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3">
            <div>
              <label className="sr-only">タスク名</label>
              <input
                type="text"
                value={currentTask.name}
                onChange={(e) => setCurrentTask({ ...currentTask, name: e.target.value })}
                placeholder="タスク名"
                className="w-full p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-3 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
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
                          aria-label={`${info.title}の説明`}
                        >
                          <Info size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded-xl min-w-[52px] text-center">
                        {Number(currentTask[key]).toFixed(1)}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="1.0"
                      max="5"
                      step="0.1"
                      value={currentTask[key]}
                      onChange={(e) =>
                        setCurrentTask({ ...currentTask, [key]: Number(e.target.value) })
                      }
                      className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-6
                      [&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-indigo-600
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-white
                      [&::-webkit-slider-thumb]:shadow-sm
                      [&::-moz-range-thumb]:w-6
                      [&::-moz-range-thumb]:h-6
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-indigo-600
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-white"
                    />
                    <div className="flex justify-between px-1 mt-1">
                      {[1, 2, 3, 4, 5].map((tick) => (
                        <span
                          key={tick}
                          className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 下部固定っぽい登録ボタン（スクロールせずに押せる） */}
        <button
          onClick={handleSaveTask}
          disabled={!currentTask.name.trim()}
          className="w-full py-3 bg-indigo-600 text-white font-bold rounded-2xl shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-all flex justify-center items-center gap-2 mt-auto"
        >
          <ListTodo size={20} />
          リストに登録する
        </button>
      </div>
    );
  };

  // 2. タスクリストタブ
  const renderListTab = () => {
    const ACTION_WIDTH = 160;

    const TaskCard = ({ task }) => {
      const isRevealed = swipeRevealTaskId === task.id;
      const isDragging = swipeDragTaskId === task.id;
      const clampedDragX = Math.max(-ACTION_WIDTH, Math.min(36, swipeDragDeltaX));
      const RIGHT_SWIPE_COMPLETE_THRESHOLD = 95;

      const swipeHandlers = useSwipeable({
        onSwiping: ({ dir, deltaX }) => {
          if (dir === 'Left') {
            setSwipeDragTaskId(task.id);
            setSwipeDragDeltaX(deltaX);
            // ドラッグ中は一旦操作ボタンを閉じる（途中の見え方を滑らかにする）
            if (swipeRevealTaskId === task.id) setSwipeRevealTaskId(null);
          }
          if (dir === 'Right') {
            // 完了誤爆を防ぐ: 右スワイプ時は視覚的な移動のみ
            if (swipeRevealTaskId === task.id) {
              setSwipeRevealTaskId(null);
            }
            setSwipeDragTaskId(task.id);
            setSwipeDragDeltaX(Math.max(0, Math.min(deltaX, RIGHT_SWIPE_COMPLETE_THRESHOLD + 20)));
          }
        },
        onSwipeEnd: () => {
          setSwipeDragTaskId(null);
          setSwipeDragDeltaX(0);
        },
        onSwipedRight: ({ deltaX }) => {
          // 一定距離以上でのみ完了扱い
          if (deltaX >= RIGHT_SWIPE_COMPLETE_THRESHOLD) {
            updateTaskStatus(task.id, 'completed');
          } else {
            setSwipeRevealTaskId(null);
          }
        },
        onSwipedLeft: () => {
          setSwipeRevealTaskId(task.id);
          setSwipeDragTaskId(null);
          setSwipeDragDeltaX(0);
        },
        delta: 25,
        trackMouse: false,
        preventScrollOnSwipe: true,
      });

      const toggleExpanded = () => {
        // スワイプで操作ボタンが開いている状態では、まずは閉じる（勝手に開閉しない）
        if (swipeRevealTaskId === task.id || swipeDragTaskId === task.id) {
          setSwipeRevealTaskId(null);
          setSwipeDragTaskId(null);
          setSwipeDragDeltaX(0);
          return;
        }
        openEditTask(task);
      };

      return (
        <div className="relative">
          {/* 左スワイプ時に右側から出てくる操作ボタン */}
          <div className="absolute inset-y-0 right-0 w-[160px] z-0 flex">
            <button
              onClick={() => updateTaskStatus(task.id, 'archived')}
              className="flex-1 bg-amber-50 text-amber-700 border border-amber-100 font-bold text-xs rounded-l-3xl"
            >
              アーカイブ
            </button>
            <button
              onClick={() => updateTaskStatus(task.id, 'deleted')}
              className="flex-1 bg-red-50 text-red-700 border border-red-100 font-bold text-xs rounded-r-3xl"
            >
              削除
            </button>
          </div>

          {/* フォアグラウンドカード（スワイプでスライド） */}
          <div
            {...swipeHandlers}
            className="relative z-10 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            style={{
              transform: isRevealed
                ? `translateX(-${ACTION_WIDTH}px)`
                : isDragging
                  ? `translateX(${clampedDragX}px)`
                  : 'translateX(0px)',
              transition: isDragging ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <div className="p-3 flex items-center gap-3">
              <button
                type="button"
                onClick={toggleExpanded}
                className="flex-1 text-left flex items-center gap-3"
                aria-label="タスク詳細を開く"
              >
                <div className="font-bold text-gray-900 text-sm leading-snug truncate min-w-0 flex-1">
                  {task.name}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(task.updatedAt)}
                </div>
              </button>
              <div className="shrink-0 text-2xl font-black tabular-nums text-indigo-600 leading-none">
                {task.totalScore}
              </div>
              <div className="shrink-0 text-gray-400">
                <ChevronDown size={18} />
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="p-4 space-y-4 pb-24 h-full flex flex-col">
        <div className="flex justify-between items-center bg-white p-3 rounded-3xl border border-gray-200 shadow-sm">
          <span className="text-sm font-bold text-gray-700">並べ替え:</span>
          <select
            value={sortConfig.key}
            onChange={(e) => handleSort(e.target.value)}
            className="text-sm border-gray-300 rounded-2xl bg-gray-50 p-1.5 outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="totalScore">総合スコア</option>
            <option value="urgency">緊急度</option>
            <option value="value">リターン</option>
            <option value="irreplaceability">代替不可能性</option>
            <option value="relation">関係資本</option>
            <option value="cost">手軽さ</option>
            <option value="updatedAt">追加日時</option>
          </select>
          <button
            onClick={() => handleSort(sortConfig.key)}
            className="p-1.5 bg-gray-100 rounded-2xl hover:bg-gray-200"
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
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </div>

        {/* タスク詳細編集モーダル（計算タブと同じ構成） */}
        {editingTask && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
            <div className="bg-slate-50 rounded-3xl p-4 w-full max-w-md shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
              <div className="rounded-3xl border border-indigo-200 bg-white p-4 text-center shadow-sm mb-4">
                <h3 className="text-sm font-bold text-gray-600 mb-2 flex items-center justify-center gap-2">
                  <Activity size={16} className="text-indigo-600" />
                  リアルタイム優先度スコア
                </h3>
                <div className="text-5xl font-black tabular-nums leading-none text-indigo-600">
                  {calculateTotalScore(editingTask, weights)}
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={editingTask.name}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  placeholder="タスク名"
                  className="w-full p-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
                />

                <div className="space-y-3 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
                  {CRITERIA_KEYS.map((key) => {
                    const info = CRITERIA_INFO[key];
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-bold ${info.text}`}>{info.title}</span>
                          <span className="text-sm font-bold bg-gray-100 px-2 py-0.5 rounded-xl min-w-[52px] text-center">
                            {Number(editingTask[key]).toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="5.0"
                          step="0.1"
                          value={editingTask[key]}
                          onChange={(e) =>
                            setEditingTask({ ...editingTask, [key]: Number(e.target.value) })
                          }
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-indigo-600
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-6
                          [&::-webkit-slider-thumb]:h-6
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-indigo-600
                          [&::-webkit-slider-thumb]:border-2
                          [&::-webkit-slider-thumb]:border-white
                          [&::-webkit-slider-thumb]:shadow-sm
                          [&::-moz-range-thumb]:w-6
                          [&::-moz-range-thumb]:h-6
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-indigo-600
                          [&::-moz-range-thumb]:border-2
                          [&::-moz-range-thumb]:border-white"
                        />
                        <div className="flex justify-between px-1 mt-1">
                          {[1, 2, 3, 4, 5].map((tick) => (
                            <span
                              key={tick}
                              className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block"
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setEditingTask(null)}
                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors active:scale-95"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveEditedTask}
                    disabled={!editingTask.name.trim()}
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 3. 設定タブ
  const renderSettingsTab = () => {
    const archivedTasks = tasks.filter((t) => t.status === 'archived');
    const deletedTasks = tasks.filter((t) => t.status === 'deleted');
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    const renderManageModal = () => {
      if (!settingsManageView) return null;

      const isCompletedView = settingsManageView === 'completed';
      const isArchivedView = settingsManageView === 'archived';
      const modalTasks = isArchivedView
        ? archivedTasks
        : isCompletedView
          ? completedTasks
          : deletedTasks;

      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-4 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  {isCompletedView ? (
                    <CheckCircle2 size={18} />
                  ) : isArchivedView ? (
                    <Archive size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </div>
                <h3 className="font-black text-lg text-gray-900">
                  {isCompletedView ? '完了済み' : isArchivedView ? 'アーカイブ済み' : '削除済み'}
                </h3>
              </div>
              <button
                onClick={() => setSettingsManageView(null)}
                className="p-2 rounded-xl hover:bg-gray-100"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>

            {modalTasks.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                タスクはありません。
              </div>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto space-y-2 pr-1">
                {modalTasks
                  .slice()
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((task) => (
                    <div
                      key={task.id}
                      className="bg-gray-50 border border-gray-100 rounded-2xl p-3"
                    >
                      <div className="font-bold text-gray-900 text-sm leading-snug">
                        {task.name}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        更新: {formatDate(task.updatedAt)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-indigo-700">
                        スコア {task.totalScore}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'active')}
                          className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs"
                        >
                          元に戻す
                        </button>
                        {!isCompletedView && (
                          <button
                            onClick={() => deleteTaskPermanently(task.id)}
                            className="flex-1 py-2 font-bold rounded-xl text-xs bg-red-600 text-white"
                          >
                            完全削除
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="p-3 flex flex-col h-full pb-16 gap-3 overflow-hidden">
        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-sm text-indigo-800 space-y-1.5">
          <p className="font-bold flex items-center gap-2">
            <Settings size={18} /> スコアの重み付け設定
          </p>
          <p className="text-xs opacity-80">
            あなたの現在の状況に合わせて、どの項目を重視するか（0.5倍〜3.0倍）を調整できます。忙しい時は「緊急度」や「代替不可能性」の倍率を上げるとより実践的なスコアになります。
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden space-y-2.5">
          <div className="space-y-2.5 bg-white p-3 rounded-3xl border border-gray-100 shadow-sm">
            {CRITERIA_KEYS.map((key) => {
              const info = CRITERIA_INFO[key];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm font-bold ${info.text}`}>{info.title}</span>
                    <span className="text-sm font-black text-gray-700 bg-gray-100 px-2 py-0.5 rounded-xl w-12 text-center">
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
                      const updatedTasks = tasks.map((t) => ({
                        ...t,
                        totalScore: calculateTotalScore(t, newWeights),
                      }));
                      setTasks(updatedTasks);
                    }}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-700
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-6
                    [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-indigo-600
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-white
                    [&::-webkit-slider-thumb]:shadow-sm
                    [&::-moz-range-thumb]:w-6
                    [&::-moz-range-thumb]:h-6
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-indigo-600
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-white"
                  />
                </div>
              );
            })}
          </div>

          {/* アーカイブ/削除済み管理 */}
          <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
            <div className="font-bold text-gray-900 text-sm mb-2">タスク管理</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSettingsManageView('archived')}
                className="py-3 bg-gray-100 text-gray-800 font-bold rounded-2xl text-sm"
              >
                アーカイブ（{archivedTasks.length}）
              </button>
              <button
                onClick={() => setSettingsManageView('completed')}
                className="py-3 bg-indigo-50 text-indigo-700 font-bold rounded-2xl text-sm"
              >
                完了（{completedTasks.length}）
              </button>
              <button
                onClick={() => setSettingsManageView('deleted')}
                className="col-span-2 py-3 bg-red-50 text-red-700 font-bold rounded-2xl text-sm"
              >
                削除済み（{deletedTasks.length}）
              </button>
            </div>
          </div>
        </div>

        {renderManageModal()}
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

        {/* メインコンテンツエリア（タブごとにスクロール制御） */}
        <main className="flex-1 overflow-hidden">
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
              {activeTaskCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">
                  {activeTaskCount}
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

