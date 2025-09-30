// services/mlAgent.ts
export class QLearningAgent {
  private qTable: number[][];
  private learningRate: number;
  private discountFactor: number;
  private numStates: number;

  constructor(numStates: number, learningRate: number, discountFactor: number) {
    this.numStates = numStates;
    this.learningRate = learningRate;
    this.discountFactor = discountFactor;
    this.qTable = Array(numStates).fill(0).map(() => Array(numStates).fill(0));
  }

  chooseAction(state: number): number {
    const epsilon = 0.1; // Exploration rate
    if (Math.random() < epsilon) return Math.floor(Math.random() * this.numStates);
    return this.qTable[Math.floor(state) % this.numStates].indexOf(Math.max(...this.qTable[Math.floor(state) % this.numStates]));
  }

  updateQValue(state: number, action: number, reward: number, nextState: number) {
    const currentQ = this.qTable[Math.floor(state) % this.numStates][action];
    const maxNextQ = Math.max(...this.qTable[Math.floor(nextState) % this.numStates]);
    this.qTable[Math.floor(state) % this.numStates][action] += this.learningRate * (reward + this.discountFactor * maxNextQ - currentQ);
  }
}