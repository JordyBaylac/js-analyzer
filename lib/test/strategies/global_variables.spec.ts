import * as esprima from "esprima";
import {
  GlobalVariablesStrategy,
  IGlobalVariablesResult,
  IScopeLeak,
  doesScopeHasLeaks
} from "../../analysis/strategies/global_variables/global_variables_strategy";
import { IStrategyResult } from "../../analysis/strategies/i_strategy";
import { expect } from "chai";

describe("GlobalVariablesStrategy", function () {

  let strategy: GlobalVariablesStrategy;

  function _constructAst(code: string): esprima.Program {
    return esprima.parseScript(code, { loc: true });
  }

  function _getScopeLeaks(ast): IScopeLeak[] {
    let analysis: IStrategyResult = strategy.process(ast);
    let result = <IGlobalVariablesResult>analysis.result;
    return result.leaks;
  }

  before(function () {
    strategy = new GlobalVariablesStrategy();
  });

  describe("# General scenarios where there should not be global variables", function () {
    it("literal string . length should not be recognized as global", function () {
      /// Arrange
      let ast = _constructAst(
        `         
          hello('asd'.length);
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert

      //no leaks
      expect(doesScopeHasLeaks(scopeLeakProgram)).to.be.false;
    });
  });


  describe("# This tests", () => {

    it("usages of global variables within this should be reported", function () {
      const ast = _constructAst(
        `         
          this.b + 5;
        `
      );

      const scopeLeaks = _getScopeLeaks(ast);
      const scopeLeakProgram = scopeLeaks[0];

      expect(doesScopeHasLeaks(scopeLeakProgram)).to.be.true;
      expect(scopeLeakProgram.globalUses[0].name).to.equal("this.b");
    });

    it("assignments to global object's members should be reported as global members", function () {
      const ast = _constructAst(
        `         
          this.b = 5;
        `
      );

      const scopeLeaks = _getScopeLeaks(ast);
      const scopeLeakProgram = scopeLeaks[0];

      expect(doesScopeHasLeaks(scopeLeakProgram)).to.be.true;
      expect(scopeLeakProgram.memberAssigns[0].name).to.equal("this.b");
    });

    it("assignments to function's caller should NOT be reported as global members", function () {
      const ast = _constructAst(
        `         
        function Person() {
          this.name = "Juan";
        }
        `
      );

      const scopeLeaks = _getScopeLeaks(ast);
      const scopeLeakProgram = scopeLeaks[0];

      expect(doesScopeHasLeaks(scopeLeakProgram)).to.be.false;
    });

  });


  describe("# Global literal assign of literal value", function () {

    it("should report 1 leak on the program scope", function () {
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

    it("should report 1 leak on a function scope", function () {
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

    it("should report 1 leak on a function scope inside another function", function () {
      /// Arrange
      let ast = _constructAst(
        `          
          function hello() {

            function world() {
              leakedVariableInside2ndFunction = 45;
            }

          }
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeak = scopeLeaks[2];

      /// Assert

      //only one leak
      expect(scopeLeak.literalAssigns).to.have.length(1);

      let literalAssign = scopeLeak.literalAssigns[0];
      expect(literalAssign.name).to.equal("leakedVariableInside2ndFunction");
    });

    it("should report 3 leaks", function () {
      /// Arrange
      let ast = _constructAst(
        `         
          damn_global = true;

          function hello() {
            off = "what?"

            function world() {
              leakedVariable = 45;
            }

          }
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];
      let scopeLeakHello = scopeLeaks[1];
      let scopeLeakWorld = scopeLeaks[2];

      /// Assert

      //only three leak
      expect(scopeLeakProgram.literalAssigns).to.have.length(1);
      expect(scopeLeakHello.literalAssigns).to.have.length(1);
      expect(scopeLeakWorld.literalAssigns).to.have.length(1);

      expect(scopeLeakProgram.literalAssigns[0].name).to.equal("damn_global");
      expect(scopeLeakHello.literalAssigns[0].name).to.equal("off");
      expect(scopeLeakWorld.literalAssigns[0].name).to.equal("leakedVariable");
    });

    it("assigns of function arguments should not be reported as globals", function () {
      /// Arrange
      let ast = _constructAst(
        `         
          function hello(param) {
            param = "what?"
          }

          hello('asd');
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakHello = scopeLeaks[1];

      /// Assert

      //no leaks
      expect(doesScopeHasLeaks(scopeLeakHello)).to.be.false;
    });

    it("globals in parent scope can be shallowed by local variable in child scope", function () {
      /// Arrange
      let ast = _constructAst(
        `   
          param = 9;
        
          function hello(param) {
            param = "what?"
          }

          hello('asd');
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];
      let scopeLeakHello = scopeLeaks[1];

      /// Assert

      expect(scopeLeakHello.literalAssigns).to.have.length(0);
      expect(scopeLeakProgram.literalAssigns[0].name).to.equal("param");
    });

    it("array elements should not be reported as globals", () => {
      const ast = _constructAst(
        `
          function test() {
            var myArray = ['AWESOME'];

            myArray[0] = 3;
          }
        `
      );

      const scopeLeaks = _getScopeLeaks(ast);
      const functionScope = scopeLeaks[1];

      expect(doesScopeHasLeaks(functionScope)).to.be.false;
      expect(functionScope.literalAssigns.length).to.equal(0);
    });

    it("assigns inside expression should be reported", function () {
      /// Arrange
      let ast = _constructAst(
        `   
          if(x = 5) {
            
          }

          for(i=0; i<34; i++){
          }

          function f() {

          }

          f(a = 45);
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert
      expect(scopeLeakProgram.literalAssigns).to.have.length(3);
      expect(scopeLeakProgram.literalAssigns[0].name).to.equal("x");
      expect(scopeLeakProgram.literalAssigns[1].name).to.equal("i");
      expect(scopeLeakProgram.literalAssigns[2].name).to.equal("a");
    });

  });


  describe("# Global member assigns", function () {

    it("should report global member assign when left part of assign is complex", function () {
      /// Arrange
      let ast = _constructAst(
        `             
          myModule.someFunc('asd').attrs[3] = 45;
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert
      expect(scopeLeakProgram.globalUses).to.have.length(1);
      expect(scopeLeakProgram.globalDefinitions[0].name).to.equal("myModule");

    });

  });


  describe("# Global definition of variables", function () {

    it("should report leakage if variables are defined in Program scope", function () {
      /// Arrange
      let ast = _constructAst(
        `
          var globalVariable; //is global bc is in the Program scope
          var globalVariable2 = 456;
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert
      expect(scopeLeakProgram.globalDefinitions).to.have.length(2);

      let leak1 = scopeLeakProgram.globalDefinitions[0];
      let leak2 = scopeLeakProgram.globalDefinitions[1];
      expect(leak1.name).to.equal("globalVariable");
      expect(leak2.name).to.equal("globalVariable2");
    });

    it("should not report leakage if variables are defined inside another scope", function () {
      /// Arrange
      let ast = _constructAst(
        `
          function func(){
            var globalVariable; //is global bc is in the Program scope
            var globalVariable2 = 456;
          }          
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert
      expect(scopeLeakProgram.globalDefinitions).to.have.length(0);
      expect(doesScopeHasLeaks(scopeLeakProgram)).to.be.false;
    });

  });


  describe("# Global uses", function () {

    it("should report global usage if passed as init value of variable declaration", function () {
      /// Arrange
      let ast = _constructAst(
        `             
          var f = j;
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakProgram = scopeLeaks[0];

      /// Assert
      expect(scopeLeakProgram.globalDefinitions).to.have.length(1);
      expect(scopeLeakProgram.globalUses).to.have.length(1);
      expect(scopeLeakProgram.globalDefinitions[0].name).to.equal("f");
      expect(scopeLeakProgram.globalUses[0].name).to.equal("j");

    });

  });


  describe("# Global member uses", function () {

    it("global member uses should be reported", function () {
      /// Arrange
      let ast = _constructAst(
        `         
          function hello(len) {
            hello(n.ka(len).length + len + hello(len));
          }

          hello('asd'.length);
          
        `
      );

      /// Act
      let scopeLeaks = _getScopeLeaks(ast);
      let scopeLeakHello = scopeLeaks[1];

      /// Assert

      expect(scopeLeakHello.globalUses).to.have.length(1);
      let memberUse = scopeLeakHello.globalUses[0];
      expect(memberUse.name).to.equal("n");
    });

    it("global member uses should be reported even with var definition", function () {
      const ast = _constructAst(
        `         
          var n;

          function hello(len) {
            hello(n.ka(len).length + len + hello(len));
          }

          hello('asd'.length);
          
        `
      );
      const scopeLeaks = _getScopeLeaks(ast);
      const scopeLeakHello = scopeLeaks[1];

      expect(scopeLeakHello.globalUses).to.have.length(1);
      const memberUse = scopeLeakHello.globalUses[0];
      expect(memberUse.name).to.equal("n");
    });

    it("member uses should not be reported as globals when defined with var in a scope != Program scope", function () {
      const ast = _constructAst(
        `         
          function hello(len) {
            var n;

            hello(n.ka(len).length + len + hello(len));
          }

          hello('asd'.length);
          
        `
      );
      const scopeLeaks = _getScopeLeaks(ast);
      const scopeLeakHello = scopeLeaks[1];

      expect(scopeLeakHello.globalUses).to.have.length(0);
    });

  });

});
