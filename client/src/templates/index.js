import Counter from './Counter.jsx';
import TodoList from './TodoList.jsx';
import Timer from './Timer.jsx';
import DiceRoller from './DiceRoller.jsx';
import LuckyWheel from './LuckyWheel.jsx';
import Voting from './Voting.jsx';
import Flashcard from './Flashcard.jsx';
import ColorPalette from './ColorPalette.jsx';
import CustomApp from './CustomApp.jsx';

export const TEMPLATE_REGISTRY = {
  counter: { component: Counter, name: '计数器' },
  todo: { component: TodoList, name: '待办清单' },
  timer: { component: Timer, name: '番茄/倒计时' },
  dice: { component: DiceRoller, name: '骰子' },
  wheel: { component: LuckyWheel, name: '抽奖转盘' },
  voting: { component: Voting, name: '投票' },
  flashcard: { component: Flashcard, name: '记忆闪卡' },
  palette: { component: ColorPalette, name: '调色板' },
  custom: { component: CustomApp, name: '定制小应用' },
};
