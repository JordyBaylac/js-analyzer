import * as esprima from 'esprima';
import { GlobalVariablesStrategy, IGlobalVariablesResult, IScopeLeak } from '../../analysis/strategies/global_variables/global_variables_strategy';
import { IStrategyResult } from '../../analysis/strategies/i_strategy';
import { expect } from 'chai'



describe('GlobalVariablesStrategy', function () {

  let strategy: GlobalVariablesStrategy;

  function _constructAst(code: string): esprima.Program {
    return esprima.parseScript(code, { loc: true });
  }  

  function _getScopeLeaks(ast): IScopeLeak[] {
      let analysis: IStrategyResult = strategy.process(ast);
      let result = <IGlobalVariablesResult>analysis.result;
      return result.leaks;
  }

  before(function() {
    strategy = new GlobalVariablesStrategy();
  });

  describe('# Global literal assign of literal value', function () {

    it('should report 1 leak in the program scope', function () {

      /// Arrange
      let ast = _constructAst(
        `
          leakedVariable = 45;
        `
      );


      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeak = scopeLeaks[0];


      /// Assert

      //only one leak
      expect(scopeLeak.literalAssigns).to.have.length(1);

      let literalAssign = scopeLeak.literalAssigns[0];
      expect(literalAssign.name).to.equal("leakedVariable");

    });

    it('should report 1 leak inside a function scope', function () {

      /// Arrange
      let ast = _constructAst(
        `
          function hello() {
            leakedVariableInsideFunction = 45;
          }
        `
      );


      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeak = scopeLeaks[1];

      /// Assert

      //only one leak
      expect(scopeLeak.literalAssigns).to.have.length(1);

      let literalAssign = scopeLeak.literalAssigns[0];
      expect(literalAssign.name).to.equal("leakedVariableInsideFunction");

    });

  });

});
