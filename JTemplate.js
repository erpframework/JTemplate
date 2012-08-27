/************************************************
 * 					JTemplate 					*
 * 					CMSPP.NET					*
 * 				   JTemplate.js					*
 *  	2012-8-28 2:34:30$	ZengOhm@gmail.com	*
 ************************************************/
var $JT = new function (){
	var _templateStore = false;
	var _dataList = null;
	var _scanTemplateName = 0;
	var _scanCode = '';
	var  _scanCodeIndex = 0;
	var _scanCodeChar = '';
	var _scanCodeLength = 0;
	var _scanCodeLine = 0;
	var _scanCodeCol = 0;
	var _codeConditionNested = 0;
	var _codeBlockNested = 0;
	/*
	 * 0	Free						-	When start
	 * 1	HTML Block					-	Start with 'First HTML Char' end with '<'
	 * 2	HTML to JTemplate border	-	When read '#' after '<'
	 * 3	JTemplate Block				-	Start with 'First JTemplate Char' end before '#'
	 * 4	JTemplate to HTML border	-	When read '#' and '>' after '#'
	 */
	var _codeState = 0;
	//var _EOT = false;
	
	var init = function(){
		var html = document.getElementsByTagName('html')[0].innerHTML;
		var reg = new RegExp("<!--\\[([\\w]*?)\\[([^\b]*?)\\]\\]-->", 'g');
		var match = null;
		_templateStore = new Array();
		while (match = reg.exec(html)) {
			if (match[1].length == 0) 
				continue;
			if (_templateStore[match[1]]) 
				throw ('There are more than one templates named by ' + match[1]);
			_templateStore[match[1]] = match[2];
		}
	};

	var _run = function(){
		_scanCodeIndex = 0;
		_scanCodeLength = _scanCode.length;
		_scanCodeLine = 0;
		_scanCodeCol = 0;
		_codeState = 0;
		var rString = '';
		
		while(_readChar()){
			switch(_codeState)	{
				case 1:
					rString+=_readHTMLBlock();
					break;
				case 3:
					rString+=_readJTemplate();
					break;
			}
		}
		return rString;
	};
	
	var _readJTemplate = function()
	{
		var rWord = '';
		do{
			if(rWord == '' && _scanCodeChar==' ')continue;
			if(_scanCodeChar=='(' || _scanCodeChar=='{' || _scanCodeChar==' '){
				return _keyWord(rWord);
			}
			rWord += _scanCodeChar;
		}while(_readChar());
		throw ('JTemplate code should be end with "#>".');
	};
	
	var _readHTMLBlock = function()
	{
		if(_codeState==4)_readChar();
		var rString = '';
		var lastWord = '';
		do{
			if(lastWord=='<' && _scanCodeChar=='#')return rString;
			rString+=lastWord;
			lastWord = _scanCodeChar;
		}while(_readChar());
		rString+=lastWord;
		return rString;
	};
	
	var _readChar = function(){
		if(_scanCodeIndex<_scanCodeLength){
			var lastChar = _scanCodeChar;
			_scanCodeChar = _scanCode.substr(_scanCodeIndex,1);
			
			if(_codeState==0)
				_codeState = 1;
			else if(_codeState==1 && lastChar=='<' && _scanCodeChar=='#')
				_codeState = 2;
			else if(_codeState==2)
				_codeState = 3;
			else if(_codeState==3 && _scanCodeChar=='#')
				_codeState = 4;
			else if(_codeState==4 && lastChar=='>')
				_codeState = 1;
			
			if(_scanCodeChar == "\n"){
				_scanCodeLine++;
				_scanCodeCol=0;
			}
			else if(_scanCodeChar == "(")_codeConditionNested++;
			else if(_scanCodeChar == ")")_codeConditionNested--;
			else if(_scanCodeChar == "{")_codeBlockNested++;
			else if(_scanCodeChar == "}")_codeBlockNested--;
			_scanCodeIndex++;
			_scanCodeCol++;
			
			if(_codeBlockNested<0)
				_codeError('Code Block Nested Error');
			if(_codeConditionNested<0)
				_codeError('Code Condition Nested Error');			
			
			//_EOT = false;
			return true;
		}else{
			_scanCodeChar = '';
			//_EOT = true;
			return false;
		}
		//return !_EOT; 
	};
	
	var _seek = function(position){
		_scanCodeLine = position.scanCodeLine;
		_scanCodeChar = position.scanCodeChar;
		_scanCodeIndex = position.scanCodeIndex;
		_scanCodeCol = position.scanCodeCol;
		_codeConditionNested = position.codeConditionNested;
		_codeBlockNested = position.codeBlockNested;
	};
	
	var _tell = function(){
		return {
					scanCodeLine:_scanCodeLine,
					scanCodeChar:_scanCodeChar,
					scanCodeIndex:_scanCodeIndex,
					scanCodeCol:_scanCodeCol,
					codeConditionNested:_codeConditionNested,
					codeBlockNested:_codeBlockNested,
					scanTemplateName:_scanTemplateName
		};
	};
	
	var _codeError = function (info){
		throw ('JTemplate Code Error in Template[' + _scanTemplateName + '] line ' + _scanCodeLine + ' char ' + _scanCodeCol + ': ' + info + '.');
	};

	var _keyWord = function(kw){
	    switch(kw)
	    {
	    	case 'if':return _keyWord_if();
	    	case 'for':return _keyWord_for();
	    	case 'while':return _keyWord_while();
	    	case 'echo':return _keyWord_echo();
	    	case 'eval':return _keyWord_eval();
	    	default:_codeError('Undefine key word :"' + kw + '".');
	    }
	};
	
	var _decodeVar = function(varCode){
		return varCode.replace(/\$([a-zA-Z_]+[a-zA-Z_])*?/g,'_dataList.$1');
	};
	
	
	var _eval = function(evalcode){
		try {
			var jsCode = _decodeVar(evalcode);
			return eval(jsCode);
		}catch(e){
			_codeError('Unexpected code "' + evalcode + '"');
		}
	};
	
	var _isJTemplateEnd_lastRunIndex = null;
	var _isJTemplateEnd = function(){
		var nowPosition = _tell();
		if(_isJTemplateEnd_lastRunIndex &&
			_isJTemplateEnd_lastRunIndex.scanCodeIndex == nowPosition.scanCodeIndex &&
			_isJTemplateEnd_lastRunIndex.scanTemplateName == nowPosition.scanTemplateName )
			return true;
		if(_scanCodeChar=='#'){
			_readChar();
			if(_scanCodeChar!='>')
				_codeError('Unknow end of line "' + _scanCodeChar + '"');
			_isJTemplateEnd_lastRunIndex = _tell();
			return true;
		}
		return false;
	};
	
	var _readToNextJTemplate = function(){
		var rString = _readJTemplate();
		rString+= _readHTMLBlock();
		return rString;
	};
	
	var _skipThisBlock = function(){
		var nowCodeBlockNested = _codeBlockNested;
		while(nowCodeBlockNested<=_codeBlockNested)_readChar();
	};
	
	
	/* Package */
	var _keyWord_if = function(){
		var enterCodeBlockNested = _codeBlockNested;
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
				rWord += _scanCodeChar;
				if(_codeConditionNested!=0)continue;
				conditionFlag = !conditionFlag && _eval(rWord);
				keywordIfRunState = 1;
				rWord = "";
			case 1:
				while(!_isJTemplateEnd())_readChar();
				if(conditionFlag)
					rString+=_readHTMLBlock();
				else
					_skipThisBlock();
				keywordIfRunState = 2;
				break;
			case 2:
				if(_scanCodeChar==' ')break;
				if(_isJTemplateEnd()){		// <#}#>
					return rString;
				}else if(_scanCodeChar=='{'){	//  <#}else{#>
					if(rWord=='else'){
						conditionFlag = !conditionFlag;
						keywordIfRunState = 1;
					}
				}else if(_scanCodeChar=='('){  // <#}else if(condition){#>   or <# if(condition){ #>
					if(rWord=='elseif'){
						rWord = _scanCodeChar;
						keywordIfRunState = 0;
					}else if(conditionFlag){
						rString += _keyWord(rWord);
						rString += _readHTMLBlock();
					}else{
						_skipThisBlock();
						rWord = '';
					}
				}else if(_scanCodeChar!='{'){
					rWord+=_scanCodeChar;
				}
				break;
			}
		}while(_readChar());
	};
	
	var _keyWord_for = function(){
		var conditionString = '';
		var rString = '';
		var conditionArray;
		var enterCodeBlockNested = _codeBlockNested;
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
					conditionString += _scanCodeChar;
					if(_codeConditionNested!=0)continue;
					conditionArray = conditionString.match(/\((.*?);(.*?);(.*?)\)/);
					if(!conditionArray) _codeError('Unexpected code "' + conditionString + '"');
					_eval(conditionArray[1]);
					
					while(!_isJTemplateEnd())_readChar();
					if(!_eval(conditionArray[2])){
						_skipThisBlock();
						while(!_isJTemplateEnd())_readChar();
						return '';
					}
					loopStartPosition = _tell();
					rString += _readHTMLBlock();
					keywordForRunState = 1;
					break;
				case 1:
					if(_scanCodeChar==' ')continue;
					if(_isJTemplateEnd()){		// <#}#>
						_eval(conditionArray[3]);
						if(!_eval(conditionArray[2]))return rString;
						_seek(loopStartPosition);
						rString += _readHTMLBlock();
					}else if(_scanCodeChar!='}'){
						rString += _readToNextJTemplate();
					}
			}
		}while(_readChar());
	};
	
	var _keyWord_echo = function(){
		var rWord = '';
		do{
			if(_isJTemplateEnd())break;
			rWord+=_scanCodeChar;
		}while(_readChar());
		return _eval(rWord);
	};
	
	var _keyWord_eval = function(){
		var rWord = '';
		do{
			if(_isJTemplateEnd())break;
			rWord+=_scanCodeChar;
		}while(_readChar());
		_eval(rWord);
		return "";
	};
	
	var _keyWord_while = function(){
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
					conditionString += _scanCodeChar;
					if(_codeConditionNested!=0)break;
					while(!_isJTemplateEnd())_readChar();
					if(!_eval(conditionString)){
						_skipThisBlock();
						while(!_isJTemplateEnd())_readChar();
						return '';
					}
					loopStartPosition = _tell();
					keywordWhileRunState = 1;
				case 1:
					if(_scanCodeChar==' ')continue;
					if(_isJTemplateEnd()){		// <#}#>
						if(!_eval(conditionString))return rString;
						_seek(loopStartPosition);
						rString += _readHTMLBlock();
					}else if(_scanCodeChar!='}'){
						rString += _readToNextJTemplate();
					}
			}
		}while(_readChar());
	};
	
	return function(templateName, dataList){
		if (!_templateStore) 
			init();
		_scanTemplateName = templateName;
		_scanCode = _templateStore[templateName];
		if(!_scanCode)
			throw('JTemplate cannot found Template named by ' + templateName);
		_dataList = dataList == null ? {} : dataList;
		return _run();
	};
};