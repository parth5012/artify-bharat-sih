module.exports={content:['./app/**/*.tsx','./components/**/*.tsx'],theme:{extend:{
 colors:{navy:{DEFAULT:'#0B2A4A',50:'#F1F5FA',100:'#E2EAF3',600:'#1E4A7A',700:'#12385F',900:'#071B30'},saffron:'#E07B00',cream:'#FBF7F0',sand:'#F1E7D6',clay:{DEFAULT:'#B4532A',dark:'#8F3F1F'},ink:'#2A1B12',moss:'#476B3A'},
 fontFamily:{display:['"Playfair Display"','Georgia','"Times New Roman"','serif']},
 keyframes:{fadeUp:{'0%':{opacity:0,transform:'translateY(10px)'},'100%':{opacity:1,transform:'none'}},pop:{'0%':{transform:'scale(.4)',opacity:0},'70%':{transform:'scale(1.12)'},'100%':{transform:'scale(1)',opacity:1}},bump:{'0%,100%':{transform:'scale(1)'},'40%':{transform:'scale(1.35)'}},slideIn:{'0%':{transform:'translateX(100%)'},'100%':{transform:'none'}}},
 animation:{'fade-up':'fadeUp .4s ease-out both',pop:'pop .5s ease-out both',bump:'bump .4s ease-out','slide-in':'slideIn .3s ease-out both'}}},plugins:[]};
