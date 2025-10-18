import { Boid } from "../strategies/Boid";

export interface IAreaConstraint {
    constrain(boid: Boid): void;
}