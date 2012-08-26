/************************************************
 * 					JTemplate 					*
 * 					CMSPP.NET					*
 * 				   JTemplate.js					*
 *  	2012-8-26 16:23:22$	ZengOhm@gmail.com	*
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
	/*
	 * 0	Free						-	When start
	 * 1	HTML Block					-	Start with 'First HTML Char' end with '<'
	 * 2	HTML to JTemplate border	-	When read '#' after '<'
	 * 3	JTemplate Block				-	Start with 'First JTemplate Char' end before '#'
	 * 4	JTemplate to HTML border	-	When read '#' and '>' after '#'
	 */
	this._codeState = 0;
	this._EOT = false;
	
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

	this._run = function(){
		this._scanCodeIndex = 0;
		this._scanCodeLength = this._scanCode.length;
		this._scanCodeLine = 0;
		this._scanCodeCol = 0;
		this._codeState = 0;
		var rString = '';
		
		while(this._readChar()){
			switch(this._codeState)	{
				case 1:
					rString+=this._readHTMLBlock();
					break;
				case 3:
					rString+=this._readJTemplate();
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
	};
	
	this._readHTMLBlock = function()
	{
		if(this._codeState==4)this._readChar();
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
	
	this._readChar = function(){
		if(this._scanCodeIndex<this._scanCodeLength){
			var lastChar = this._scanCodeChar;
			this._scanCodeChar = this._scanCode.substr(this._scanCodeIndex,1);
			
			if(this._codeState==0)
				this._codeState = 1;
			else if(this._codeState==1 && lastChar=='<' && this._scanCodeChar=='#')
				this._codeState = 2;
			else if(this._codeState==2)
				this._codeState = 3;
			else if(this._codeState==3 && this._scanCodeChar=='#')
				this._codeState = 4;
			else if(this._codeState==4 && lastChar=='>')
				this._codeState = 1;
			
			if(this._scanCodeChar == "\n"){
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
			
			this._EOT = false;
		}else{
			this._scanCodeChar = '';
			this._EOT = true;
		}
		return !this._EOT; 
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
					codeBlockNested:this._codeBlockNested,
					scanTemplateName:this._scanTemplateName
		};
	};
	
	this._codeError = function (info){
		throw ('JTemplate Code Error in Template[' + this._scanTemplateName + '] line ' + this._scanCodeLine + ' char ' + this._scanCodeCol + ': ' + info + '.');
	};

	this._keyWord = function(kw){
	    var funName = 'this._keyWord_'+kw;
	    if(typeof(eval(funName))=='function')
	        return eval(funName+'();');
	    else
	        this._codeError('Undefine key word :"' + kw + '".');
	};
	
	this._decodeVar = function(varCode){
		return varCode.replace(/\$([a-zA-Z_]+[a-zA-Z_])*?/g,'this._dataList.$1');
	};
	
	
	this._eval = function(evalcode){
		try {
			var jsCode = this._decodeVar(evalcode);
			return eval(jsCode);
		}catch(e){
			this._codeError('Unexpected code "' + evalcode + '"');
		}
	};
	
	this._isJTemplateEnd_lastRunIndex = null;
	this._isJTemplateEnd = function(){
		var nowPosition = this._tell();
		if(this._isJTemplateEnd_lastRunIndex &&
			this._isJTemplateEnd_lastRunIndex.scanCodeIndex == nowPosition.scanCodeIndex &&
			this._isJTemplateEnd_lastRunIndex.scanTemplateName == nowPosition.scanTemplateName )
			return true;
		if(this._scanCodeChar=='#'){
			this._readChar();
			if(this._scanCodeChar!='>')
				this._codeError('Unknow end of line "' + this._scanCodeChar + '"');
			this._isJTemplateEnd_lastRunIndex = this._tell();
			return true;
		}
		return false;
	};
	
	this._readToNextJTemplate = function(){
		var rString = this._readJTemplate();
		rString+= this._readHTMLBlock();
		return rString;
	};
	
	this._skipThisBlock = function(){
		var nowCodeBlockNested = this._codeBlockNested;
		while(nowCodeBlockNested<=this._codeBlockNested)this._readChar();
	};
};
var JTemplate = new _JTemplate();
var $JT = function(a,b){return JTemplate.display(a,b);};

/* Package */
_JTemplate.prototype._keyWord_if = function(){
	var enterCodeBlockNested = this._codeBlockNested;
	var rWord = '';
	var rString = '';
	var conditionFlag = false
	/*
	 * 0	Read condition
	 * 1	Jurge condition
	 * 2 	Into block
	 */
	var keywordIfRunState = 0;
	do
	{
		switch(keywordIfRunState)
		{
		case 0:
			rWord += this._scanCodeChar;
			if(this._codeConditionNested!=0)continue;
			conditionFlag = !conditionFlag && this._eval(rWord);
			keywordIfRunState = 1;
			rWord = "";
		case 1:
			while(!this._isJTemplateEnd())this._readChar();
			if(conditionFlag)
				rString+=this._readHTMLBlock();
			else
				this._skipThisBlock();
			keywordIfRunState = 2;
			break;
		case 2:
			if(this._scanCodeChar==' ')break;
			if(this._isJTemplateEnd()){		// <#}#>
				return rString;
			}else if(this._scanCodeChar=='{'){	//  <#}else{#>
				if(rWord=='else'){
					conditionFlag = !conditionFlag;
					keywordIfRunState = 1;
				}
			}else if(this._scanCodeChar=='('){  // <#}else if(condition){#>   or <# if(condition){ #>
				if(rWord=='elseif'){
					rWord = this._scanCodeChar;
					keywordIfRunState = 0;
				}else if(conditionFlag){
					rString += this._keyWord(rWord);
					rString += this._readHTMLBlock();
				}else{
					this._skipThisBlock();
					rWord = '';
				}
			}else if(this._scanCodeChar!='{'){
				rWord+=this._scanCodeChar;
			}
			break;
		}
	}while(this._readChar());
};

_JTemplate.prototype._keyWord_for = function(){
	var conditionString = '';
	var rString = '';
	var conditionArray;
	var enterCodeBlockNested = this._codeBlockNested;
	var loopStartPosition;
	/*
	 * 0	Read condition
	 * 1	Enter Loop
	 */
	var keywordForRunState = 0;
	do{
		switch(keywordForRunState)
		{
			case 0:
				conditionString += this._scanCodeChar;
				if(this._codeConditionNested!=0)continue;
				conditionArray = conditionString.match(/\((.*?);(.*?);(.*?)\)/);
				if(!conditionArray) this._codeError('Unexpected code "' + evalcode + '"');
				this._eval(conditionArray[1]);
				
				while(!this._isJTemplateEnd())this._readChar();
				if(!this._eval(conditionArray[2])){
					this._skipThisBlock();
					return '';
				}
				loopStartPosition = this._tell();
				rString += this._readHTMLBlock();
				keywordForRunState = 1;
				break;
			case 1:
				if(this._scanCodeChar==' ')continue;
				if(this._isJTemplateEnd()){		// <#}#>
					this._eval(conditionArray[3]);
					if(!this._eval(conditionArray[2]))return rString;
					this._seek(loopStartPosition);
					rString += this._readHTMLBlock();
				}else if(this._scanCodeChar!='}'){
					rString += this._readToNextJTemplate();
				}
		}
	}while(this._readChar());
};

_JTemplate.prototype._keyWord_echo = function(){
	var rWord = '';
	do{
		if(this._isJTemplateEnd())break;
		rWord+=this._scanCodeChar;
	}while(this._readChar());
	return this._eval(rWord);
};

_JTemplate.prototype._keyWord_eval = function(){
	var rWord = '';
	do{
		if(this._isJTemplateEnd())break;
		rWord+=this._scanCodeChar;
	}while(this._readChar());
	this._eval(rWord);
	return "";
};

_JTemplate.prototype._keyWord_while = function(){
	var rString = '';
	var conditionString = '';
	var loopStartPosition = false;
	/*
	 * 0	Read condition
	 * 1	Enter Loop
	 */
	var keywordWhileRunState = 0;
	do{
		switch(keywordWhileRunState)
		{
			case 0:
				conditionString += this._scanCodeChar;
				if(this._codeConditionNested!=0)break;
				while(!this._isJTemplateEnd())this._readChar();
				if(!this._eval(conditionString)){
					this._skipThisBlock();
					return '';
				}
				loopStartPosition = this._tell();
				keywordWhileRunState = 1;
			case 1:
				if(this._scanCodeChar==' ')continue;
				if(this._isJTemplateEnd()){		// <#}#>
					if(!this._eval(conditionString))return rString;
					this._seek(loopStartPosition);
					rString += this._readHTMLBlock();
				}else if(this._scanCodeChar!='}'){
					rString += this._readToNextJTemplate();
				}
		}
	}while(this._readChar());
};