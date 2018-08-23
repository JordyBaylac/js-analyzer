import { IStrategy, IStrategyResult, IStrategySingleResult, StrategiesTypes } from '../i_strategy';
import { Node, SourceLocation } from 'estree';
import { Program } from 'esprima';
import { traverse } from 'estraverse';
import * as utils from './esprima_utils';


export interface ILeakType {
    name: string,
    description: string,
    location: SourceLocation;
}

export interface IScopeLeak {
    scopeDescription?: string,
    globalDefinitions: ILeakType[];
    globalUses: ILeakType[];
    memberAssigns: ILeakType[];
    literalAssigns: ILeakType[];
}

export interface IGlobalVariablesResult extends IStrategySingleResult {
    leaks: IScopeLeak[]
}

export function doesScopeHasLeaks(scopeInfo: IScopeLeak) {
    return scopeInfo.globalDefinitions.length > 0
        || scopeInfo.globalUses.length > 0
        || scopeInfo.memberAssigns.length > 0
        || scopeInfo.literalAssigns.length > 0;
}

export class GlobalVariablesStrategy implements IStrategy {

    process(ast: Program): IStrategyResult {

        let leaks: IScopeLeak[] = [];

        let variablesChain = [];
        let scopeChain = [];
        let usesChain = [];
        let assignmentsChain = [];
        let catchsChain = [];

        traverse(ast, {
            enter: (node, parent) => {

                if (utils.shouldCreatesNewScope(node)) {
                    scopeChain.push([]);
                    variablesChain.push([]);
                    usesChain.push([]);
                    assignmentsChain.push([]);
                }

                let currentScope = scopeChain[scopeChain.length - 1];
                let variableScope = variablesChain[variablesChain.length - 1];
                let usesInScope = usesChain[usesChain.length - 1];
                let assignemtsInScope = assignmentsChain[assignmentsChain.length - 1];

                if (utils.isVariableDeclarator(node)) {

                    currentScope.push(node.id.name);
                    variableScope.push(node);

                } else if (utils.isAssignmentExpression(node)) {

                    assignemtsInScope.push(node);

                } else if (utils.isFunctionDeclaration(node) || utils.isFunctionExpression(node)) {

                    let params = node.params;
                    for (let i in params) {
                        currentScope.push(params[i].name);
                    }

                    if (node.id && utils.isIdentifier(node.id) && node.id.name) {
                        currentScope.push(node.id.name);
                        let previousScope = (scopeChain.length - 2) >= 0 ? scopeChain[scopeChain.length - 2] : null;
                        if (previousScope) {
                            previousScope.push(node.id.name);
                        }
                    }

                } else if (utils.isCatchClause(node) && utils.isIdentifier(node.param)) {
                    catchsChain.push(node.param.name);
                }

                let scopeUses = this.getGlobalUsesInNode(node);
                if (scopeUses.length > 0) {
                    // let result = scopeUses.filter( (u: ILeakType) => usesInScope.find((s: ILeakType)=> this.compareLeaks(u, s)) == null );
                    // usesInScope.push(...result);
                    usesInScope.push(...scopeUses);
                }

            },
            leave: (node, parent) => {


                if (utils.shouldCreatesNewScope(node)) {

                    let scopeLeak: IScopeLeak = {
                        scopeDescription: utils.getScopeDescription(node),
                        globalDefinitions: [],
                        globalUses: [],
                        memberAssigns: [],
                        literalAssigns: []
                    };

                    let assigmentsInScope = assignmentsChain.pop();

                    let memberAndLiteralLeaks = this.checkForMemberAndLiteralLeaks(assigmentsInScope, scopeChain);
                    scopeLeak.memberAssigns = memberAndLiteralLeaks.memberAssigns;
                    scopeLeak.literalAssigns = memberAndLiteralLeaks.literalAssigns.filter(a => !utils.isCatchArgument(a.name, catchsChain));


                    let variableScope = variablesChain.pop();

                    if (node && utils.isProgam(node)) {
                        let globals = this.getGlobalVariablesDefinition(variableScope);
                        scopeLeak.globalDefinitions = globals;
                    }

                    let usesScope = usesChain.pop();
                    usesScope.filter((u: ILeakType) => !utils.isCatchArgument(u.name, catchsChain))
                        .forEach((s: ILeakType) => {
                            if (!utils.isVarDefined(s.name, scopeChain) && !this.isLeakDuplicate(s, scopeLeak.globalUses)) {
                                scopeLeak.globalUses.push(s);
                            }
                        });

                    scopeChain.pop();

                    leaks.unshift(scopeLeak);

                } else if (utils.isCatchClause(node) && utils.isIdentifier(node.param)) {

                    for (let i = 0; i < usesChain.length; i++) {
                        let usesScope = usesChain[i];
                        let withouthUsesOfCatchArguments = usesScope.filter((s: ILeakType) => !utils.isCatchArgument(s.name, catchsChain));
                        usesChain[i] = withouthUsesOfCatchArguments;
                    }

                    catchsChain.pop();

                }
            }
        });

        return <IStrategyResult>{
            type: StrategiesTypes.GlobalVariablesStrategy,
            result: <IGlobalVariablesResult>{
                leaks: this.removeDuplicates(leaks)
            }
        };

    }

    protected removeDuplicates(leaks: IScopeLeak[]): IScopeLeak[] {
        return leaks;

        // let newLeaks: IScopeLeak[] = [];

        // leaks.forEach(leak => {

        //     let leakTypes: IScopeLeak = {
        //         globalDefinitions: leak.leaksTypes.globalDefinitions.filter(filterLeakType),
        //         globalUses: leak.leaksTypes.globalUses.filter(filterLeakType),
        //         memberAssigns: leak.leaksTypes.memberAssigns.filter(filterLeakType),
        //         literalAssigns: leak.leaksTypes.literalAssigns.filter(filterLeakType)
        //     };

        //     newLeaks.push({scopeDescription: leak.scopeDescription, leaksTypes: leakTypes});
        // })

        // return newLeaks;

        // function filterLeakType(leakType: ILeakType, index, array: ILeakType[]) {
        //     return index === array.findIndex((t) => (
        //         t.name === leakType.name && t.location.start === leakType.location.start && t.location.end === leakType.location.end
        //     ));
        // }

    }


    protected isLeakDuplicate(leakType: ILeakType, leakTypes: ILeakType[]) {
        return leakTypes.find((t) => this.compareLeaks(t, leakType)) != null;
    }

    protected compareLeaks(leak1: ILeakType, leak2: ILeakType) {
        return leak1.name === leak2.name && leak1.location.start === leak2.location.start && leak1.location.end === leak2.location.end;
    }

    protected checkForMemberAndLiteralLeaks(assignments, scopeChain): IScopeLeak {

        let leakTypes: IScopeLeak = {
            globalDefinitions: [],
            globalUses: [],
            memberAssigns: [],
            literalAssigns: []
        };

        for (let i = 0; i < assignments.length; i++) {

            let assignment = assignments[i];
            let varname = '';
            let description = '';


            if (utils.isMemberExpression(assignment.left)) {
                varname = utils.compoundMemberName(assignment.left);
                if (varname.indexOf('.prototype') == -1
                    && varname.indexOf('this.') == -1
                    && varname.indexOf('Object.') == -1
                    && varname.indexOf('Array.') == -1
                    && varname.indexOf('Math.') == -1
                    && varname.indexOf('JSON.') == -1) {

                    let firstObject = varname.split('.')[0];
                    if (!utils.isVarDefined(firstObject, scopeChain)) {
                        description = '(member assign) ' + varname;

                        let leakType: ILeakType = { name: varname, description: description, location: Object.create(assignment.loc) };
                        leakTypes.memberAssigns.push(leakType);
                    }
                }
            } else
                if (!utils.isMemberExpression(assignment.left)) {
                    varname = assignment.left.name;
                    if (!utils.isVarDefined(varname, scopeChain)) {
                        description = '(literal assign) ' + varname;

                        let leakType: ILeakType = { name: varname, description: description, location: Object.create(assignment.loc) };
                        leakTypes.literalAssigns.push(leakType);
                    }
                }

        }


        return leakTypes;
    }

    protected getGlobalVariablesDefinition(variableScope: Node[]): ILeakType[] {
        let globals: ILeakType[] = [];
        for (let variable of variableScope) {

            let varname = variable["id"].name;
            let description = '(declared global variable) ' + varname;
            let leakType: ILeakType = { name: varname, description: description, location: Object.create(variable.loc) };

            globals.push(leakType);
        }
        return globals;
    }

    protected getGlobalUsesInNode(node: Node): ILeakType[] {

        let uses: ILeakType[] = [];

        if (utils.isBinaryExpression(node)) {

            if (utils.isIdentifier(node["left"])) {
                let varname = node["left"].name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: Object.create(node["left"].loc) };
                uses.push(leakType);

            } else if (utils.isIdentifier(node["right"])) {
                let varname = node["right"].name;
                let description = '(global use) ' + varname;
                let leakType: ILeakType = { name: varname, description: description, location: Object.create(node["right"].loc) };
                uses.push(leakType);

            } else if (utils.isBinaryExpression(node["left"])) {

                uses = uses.concat(this.getGlobalUsesInNode(node["left"]));

            } else if (utils.isBinaryExpression(node["right"])) {

                uses = uses.concat(this.getGlobalUsesInNode(node["right"]));

            } else if (utils.isMemberExpression(node["left"])) {

                let leakType: ILeakType = this.getGlobalMemberUseLeakType(node["left"]);
                uses.push(leakType);

            } else if (utils.isMemberExpression(node["right"])) {

                let leakType: ILeakType = this.getGlobalMemberUseLeakType(node["right"]);
                uses.push(leakType);

            }

        } else if (utils.isCallExpression(node)) {

            node["arguments"].forEach(a => {
                if (utils.isIdentifier(a)) {
                    let varname = a.name;
                    let description = '(global use) ' + varname;
                    let leakType: ILeakType = { name: varname, description: description, location: Object.create(a.loc) };
                    uses.push(leakType);
                } else if (utils.isMemberExpression(a)) {
                    let leakType: ILeakType = this.getGlobalMemberUseLeakType(a);
                    uses.push(leakType);
                }
            });

        }

        return uses.filter(u => u !== null && ["__func__", "__path__", "__file__", "Math", "Object", "Array", "JSON", "this", "xxNode", "xxNodeSet"].indexOf(u.name) === -1);
    }

    protected getGlobalMemberUseLeakType(node): ILeakType {
        if (utils.isMemberExpression(node)) {
            let varname = utils.compoundMemberName(node);
            let firstObject = varname.split('.')[0];
            let description = '(global member use) ' + varname;
            return { name: firstObject, description: description, location: Object.create(node.loc) };
        }
        return null;
    }

}