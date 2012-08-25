/************************************************
 * 					JTemplate 					*
 * 					CMSPP.NET					*
 * 				   JTemplate.js					*
 *  	2012-8-25 18:18:05$	ZengOhm@gmail.com	*
 ************************************************/
function _JTemplate(){
	this._templateStore = new Array();
	this._dataList = null;
	this._scanTemplateName = 0;
	this._scanCode = '';
	this._scanCodeIndex = 0;
	this._scanCodeChar = '';
	this._scanCodeLength = 0;
	this._scanCodeLine = 0;
	this._scanCodeCol = 0;
	this._codeConditionNested = 0;
	this._codeBlockNested = 0;
	
	this.init = function(){
		var html = document.getElementsByTagName('html')[0].innerHTML;
		var reg = new RegExp("<!--\\[([\\w]*?)\\[([^\b]*?)\\]\\]-->", 'g');
		var match = null;
		while (match = reg.exec(html)) {
			if (match[1].length == 0) 
				continue;
			if (this._templateStore[match[1]]) 
				throw ('There are more than one templates named by ' + match[1]);
			this._templateStore[match[1]] = match[2];
		}
	};
	
	this.display = function(templateName, dataList){
		if (this._templateStore.length == 0) 
			this.init();
		this._scanTemplateName = templateName;
		this._scanCode = this._templateStore[templateName];
		if(!this._scanCode)
			throw('JTemplate cannot found Template named by ' + templateName);
		this._dataList = dataList == null ? {} : dataList;
		return this._run();
	};

	this._run = function()
	{
		this._scanCodeIndex = 0;
		this._scanCodeLength = this._scanCode.length;
		this._scanCodeLine = 0;
		this._scanCodeCol = 0;
		/*
		 * 0  HTML代码区
		 * 1  JTemplate Code
		 */
		var scanCodeState = 0;
		var rString = '';
		
		while(this._readChar())
		{
			switch(scanCodeState)
			{
				case 0:
					rString+=this._readHTMLBlock();
					scanCodeState = 1;
					break;
				case 1:
					rString+=this._readJTemplate();
					scanCodeState = 0;
					break;
			}
		}
		return rString;
	};
	
	this._readJTemplate = function()
	{
		var rWord = '';
		do{
			if(rWord == '' && this._scanCodeChar==' ')continue;
			if(this._scanCodeChar=='(' || this._scanCodeChar=='{' || this._scanCodeChar==' '){
				return this._keyWord(rWord);
			}
			rWord += this._scanCodeChar;
		}while(this._readChar());
		throw ('JTemplate code should be end with "#>".');
	}
	
	this._readHTMLBlock = function()
	{
		var rString = '';
		var lastWord = '';
		do{
			if(lastWord=='<' && this._scanCodeChar=='#')return rString;
			
			rString+=lastWord;
			lastWord = this._scanCodeChar;
		}while(this._readChar());
		rString+=lastWord;
		return rString;
	};
	
	this._readChar = function()
	{
		if(this._scanCodeIndex<this._scanCodeLength)
		{
			this._scanCodeChar = this._scanCode.substr(this._scanCodeIndex,1);
			if(this._scanCodeChar == "\n")
			{
				this._scanCodeLine++;
				this._scanCodeCol=0;
			}
			else if(this._scanCodeChar == "(")this._codeConditionNested++;
			else if(this._scanCodeChar == ")")this._codeConditionNested--;
			else if(this._scanCodeChar == "{")this._codeBlockNested++;
			else if(this._scanCodeChar == "}")this._codeBlockNested--;

			this._scanCodeIndex++;
			this._scanCodeCol++;
			
			if(this._codeBlockNested<0)
				this._codeError('Code Block Nested Error');
			if(this._codeConditionNested<0)
				this._codeError('Code Condition Nested Error');			
			
			return true;
		}
		else
		{
			this._scanCodeChar = '';
			return false;
		}
	};
	
	this._seek = function(position){
		this._scanCodeLine = position.scanCodeLine;
		this._scanCodeChar = position.scanCodeChar;
		this._scanCodeIndex = position.scanCodeIndex;
		this._scanCodeCol = position.scanCodeCol;
		this._codeConditionNested = position.codeConditionNested;
		this._codeBlockNested = position.codeBlockNested;
	};
	
	this._tell = function(){
		return {
					scanCodeLine:this._scanCodeLine,
					scanCodeChar:this._scanCodeChar,
					scanCodeIndex:this._scanCodeIndex,
					scanCodeCol:this._scanCodeCol,
					codeConditionNested:this._codeConditionNested,
					codeBlockNested:this._codeBlockNested
		};
	};
	
	this._codeError = function (info)
	{
		throw ('JTemplate Code Error in Template[' + this._scanTemplateName + '] line ' + this._scanCodeLine + ' char ' + this._scanCodeCol + ': ' + info + '.');
	}

	this._keyWord = function(kw)
	{
	    var funName = 'this._keyWord_'+kw;
	    if(typeof(eval(funName))=='function')
	        return eval(funName+'();');
	    else
	        this._codeError('Undefine key word :"' + kw + '".');
	};
	
	this._eval = function(evalcode)
	{
		try {
			var jsCode = evalcode.replace(/\$([a-zA-Z_]+[a-zA-Z_])*?/g,'this._dataList.$1');
			return eval(jsCode);
		}catch(e){
			this._codeError('Unexpected code "' + evalcode + '"');
		}
	}
};

_JTemplate.prototype._keyWord_if = function(){
	var enterCodeBlockNested = this._codeBlockNested;
	var rWord = '';
	var rString = '';
	var conditionFlag = true
	/*
	 * 0	Read condition
	 * 1	Into Code Block
	 * 2 	In Html Block
	 * 3	End of If Block, May else or else if
	 * 4	else or else if or #
	 */
	var keywordIfRunState = 0;
	do
	{
		switch(keywordIfRunState)
		{
		case 0:
			rWord += this._scanCodeChar;
			if(this._codeConditionNested==0)
			{
				this._eval(rWord);
				keywordIfRunState = 1;
				rWord = "";
			}
			break;
		case 1:
			if(this._scanCodeChar=='#')
				keywordIfRunState = 2;
			break;
		case 2:
			if(this._scanCodeChar!='>')
				this._codeError('Unknow end of line "' + this._scanCodeChar + '"');
			this._readChar();
			var html = this._readHTMLBlock();
			if(conditionFlag)
				rString+=html;
			keywordIfRunState = 3;
			break;
		case 3:
			if(this._scanCodeChar==' ' || this._scanCodeChar=='}')break;
			else keywordIfRunState=4;
		case 4:
			if(this._scanCodeChar=='#'){		// <#}#>
				if(enterCodeBlockNested != this._codeBlockNested)
					this._codeError('Code Block Nested Error');
				this._readChar();
				if(this._scanCodeChar!='>')
					this._codeError('Unknow end of line "' + this._scanCodeChar + '"');
				return rString;
			}else if(this._scanCodeChar==' '){
				break;
			}else if(this._scanCodeChar=='{'){	//  <#}else{#>
				if(rWord=='else'){
					conditionFlag = !conditionFlag;
					keywordIfRunState = 1;
				}else{
					this._codeError('Unexpected end of line "' + this._scanCodeChar + '"');
				}
			}else if(this._scanCodeChar=='('){  // <#}else if(condition){#>   or <# if(condition){ #>
				if(rWord=='elseif'){
					conditionFlag = !conditionFlag;
					rWord = this._scanCodeChar;
					keywordIfRunState = 1;
				}else{
					var html = this._keyWord(rWord);
					this._readChar();
					html += this._readHTMLBlock();
					if(conditionFlag)
						rString += html;
					keywordIfRunState = 3;
					rWord = '';
				}
			}else{
				rWord+=this._scanCodeChar;
			}
			break;
		}
	}while(this._readChar());
};

_JTemplate.prototype._keyWord_for = function(){
	var rWord = '';
	var rString = '';
	var conditionArray;
	var conditionFlag;
	var enterCodeBlockNested = this._codeBlockNested;
	var loopStartPosition;
	/*
	 * 0	Read condition
	 * 1	Enter Loop
	 * 2	Wait for HTMLBlock
	 * 3	Wait for HTMLBlock End
	 */
	var keywordForRunState = 0;
	do{
		switch(keywordForRunState)
		{
			case 0:
				rWord += this._scanCodeChar;
				if(this._codeConditionNested==0)
				{
					conditionArray = rWord.match(/\((.*?);(.*?);(.*?)\)/);
					if(!conditionArray)
						this._codeError('Unexpected code "' + evalcode + '"');
					
					this._eval(conditionArray[1]);
					keywordForRunState = 1;
					rWord = "";
				}
				break;
			case 1:
				if(this._scanCodeChar==' ')break;
				conditionFlag = this._eval(conditionArray[2]);
				if(!conditionFlag)return rString;
				keywordForRunState = 2;
				break;
			case 2:
				if(this._scanCodeChar==' ')break;
				else if(this._scanCodeChar=='#')break;
				else if(this._scanCodeChar=='>')
				{
					this._readChar();
					loopStartPosition = this._tell();
					rString += this._readHTMLBlock();
					keywordForRunState = 3;
				}
				break;
			case 3:
				if(this._scanCodeChar==' '){
					break;
				}else if(this._scanCodeChar=='#'){		// <#}#>
					if(enterCodeBlockNested != this._codeBlockNested)
						this._codeError('Code Block Nested Error');
					this._readChar();
					if(this._scanCodeChar!='>')
						this._codeError('Unknow end of line "' + this._scanCodeChar + '"');
					this._eval(conditionArray[3]);
					conditionFlag = this._eval(conditionArray[2]);
					if(!conditionFlag)return rString;
					else{
						this._seek(loopStartPosition);
						rString += this._readHTMLBlock();
					}
				}else if(this._scanCodeChar!='}'){
					rString+= this._readJTemplate();
					this._readChar();
					rString+= this._readHTMLBlock();
				}else if(this._scanCodeChar=='(' || this._scanCodeChar=='{'){  // <# if(condition){ #>
					rString += this._keyWord(rWord);
					this._readChar();
					rString += this._readHTMLBlock();
					rWord = '';
				}else{
					rWord+=this._scanCodeChar;
				}
		}
	}while(this._readChar());
}

_JTemplate.prototype._keyWord_echo = function(){
	var rWord = '';
	do{
		if(this._scanCodeChar=='#')
		{
				this._readChar();
				if(this._scanCodeChar=='>')break;
				else this._codeError('Unknow end line "' + this._scanCodeChar + '"');
		}
		rWord+=this._scanCodeChar;
	}while(this._readChar());
	return this._eval(rWord);
}

_JTemplate.prototype._keyWord_eval = function(){
	var rWord = '';
	do{
		if(this._scanCodeChar=='#')
		{
				this._readChar();
				if(this._scanCodeChar=='>')break;
				else this._codeError('Unknow end line "' + this._scanCodeChar + '"');
		}
		rWord+=this._scanCodeChar;
	}while(this._readChar());
	this._eval(rWord);
	return "";
}

_JTemplate.prototype._keyWord_while = function(){
	var rWord = '';
	var rString = '';
	var conditionString;
	var conditionFlag;
	var enterCodeBlockNested = this._codeBlockNested;
	var loopStartPosition;
	/*
	 * 0	Read condition
	 * 1	Enter Loop
	 * 2	Wait for HTMLBlock
	 * 3	Wait for HTMLBlock End
	 */
	var keywordForRunState = 0;
	do{
		switch(keywordForRunState)
		{
			case 0:
				rWord += this._scanCodeChar;
				if(this._codeConditionNested==0)
				{
					conditionString = rWord;
					this._eval(conditionString);
					keywordForRunState = 1;
					rWord = "";
				}
				break;
			case 1:
				if(this._scanCodeChar==' ')break;
				conditionFlag = this._eval(conditionString);
				if(!conditionFlag)return rString;
				keywordForRunState = 2;
				break;
			case 2:
				if(this._scanCodeChar==' ')break;
				else if(this._scanCodeChar=='#')break;
				else if(this._scanCodeChar=='>')
				{
					this._readChar();
					loopStartPosition = this._tell();
					rString += this._readHTMLBlock();
					keywordForRunState = 3;
				}
				break;
			case 3:
				if(this._scanCodeChar==' '){
					break;
				}else if(this._scanCodeChar=='#'){		// <#}#>
					if(enterCodeBlockNested != this._codeBlockNested)
						this._codeError('Code Block Nested Error');
					this._readChar();
					if(this._scanCodeChar!='>')
						this._codeError('Unknow end of line "' + this._scanCodeChar + '"');
					conditionFlag = this._eval(conditionString);
					if(!conditionFlag)return rString;
					else{
						this._seek(loopStartPosition);
						rString += this._readHTMLBlock();
					}
				}else if(this._scanCodeChar!='}'){
					rString+= this._readJTemplate();
					this._readChar();
					rString+= this._readHTMLBlock();
				}else if(this._scanCodeChar=='(' || this._scanCodeChar=='{'){  // <# if(condition){ #>
					rString += this._keyWord(rWord);
					this._readChar();
					rString += this._readHTMLBlock();
					rWord = '';
				}else{
					rWord+=this._scanCodeChar;
				}
		}
	}while(this._readChar());
}

var JTemplate = new _JTemplate();
var $JT = function(a,b){return JTemplate.display(a,b);};

