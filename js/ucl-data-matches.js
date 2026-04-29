/* =============================================
   UCL-DATA-MATCHES.JS — 2025/26 歐冠聯賽賽程
   新制聯賽階段：36隊各踢8場（4主4客）
   淘汰賽：附加賽→16強→8強→4強→決賽
   時間皆為台灣時間（UTC+8）
   ============================================= */

const UCL_MATCHES = [

  // ===== 淘汰賽附加賽 第一回合 (2026-02-18 / 02-19 台灣時間) =====
  // 歐洲時間 Feb 17-18, 21:00/18:45 CET → 台灣 +1天 04:00/01:45
  // stats: {poss:[主,客], shots:[主,客], sot:[主,客], corners:[主,客], yellow:[主,客], saves:[主,客]} — 資料來源 ESPN
  {id:'UCL-PO-01', date:'2026-02-18', time:'04:00', home:'BEN', away:'RMA', stage:'playoff', leg:1, status:'finished', score:{h:0,a:1}, stats:{poss:[41.7,58.3],shots:[10,16],sot:[3,7],corners:[3,6],yellow:[2,2],saves:[6,3]}, goals:[{min:'50',player:'Vinícius Júnior',side:'a'}]},
  {id:'UCL-PO-02', date:'2026-02-18', time:'04:00', home:'MON', away:'PSG', stage:'playoff', leg:1, status:'finished', score:{h:2,a:3}, stats:{poss:[19.6,80.4],shots:[7,30],sot:[4,10],corners:[1,8],yellow:[2,0],saves:[7,2]}, goals:[{min:'1',player:'Folarin Balogun',side:'h'},{min:'18',player:'Folarin Balogun',side:'h'},{min:'29',player:'Désiré Doué',side:'a'},{min:'41',player:'Achraf Hakimi',side:'a'},{min:'67',player:'Désiré Doué',side:'a'}]},
  {id:'UCL-PO-03', date:'2026-02-18', time:'01:45', home:'GAL', away:'JUV', stage:'playoff', leg:1, status:'finished', score:{h:5,a:2}, stats:{poss:[61.8,38.2],shots:[22,7],sot:[9,3],corners:[5,5],yellow:[1,1],saves:[1,4]}, goals:[{min:'15',player:'Gabriel Sara',side:'h'},{min:'16',player:'Teun Koopmeiners',side:'a'},{min:'32',player:'Teun Koopmeiners',side:'a'},{min:'49',player:'Noa Lang',side:'h'},{min:'60',player:'Davinson Sánchez',side:'h'},{min:'74',player:'Noa Lang',side:'h'},{min:'86',player:'Sacha Boey',side:'h'}]},
  {id:'UCL-PO-04', date:'2026-02-18', time:'04:00', home:'DOR', away:'ATA', stage:'playoff', leg:1, status:'finished', score:{h:2,a:0}, stats:{poss:[44.4,55.6],shots:[9,7],sot:[2,3],corners:[3,2],yellow:[2,3],saves:[3,0]}, goals:[{min:'3',player:'Serhou Guirassy',side:'h'},{min:'42',player:'Maximilian Beier',side:'h'}]},
  {id:'UCL-PO-05', date:'2026-02-19', time:'01:45', home:'QAR', away:'NEW', stage:'playoff', leg:1, status:'finished', score:{h:1,a:6}, stats:{poss:[42,58],shots:[8,22],sot:[2,14],corners:[8,6],yellow:[0,1],saves:[8,1]}, goals:[{min:'3',player:'Anthony Gordon',side:'a'},{min:'8',player:'Malick Thiaw',side:'a'},{min:'32',player:'Anthony Gordon',side:'a',type:'pen'},{min:'33',player:'Anthony Gordon',side:'a'},{min:'45+1',player:'Anthony Gordon',side:'a',type:'pen'},{min:'54',player:'Elvin Cafarquliyev',side:'h'},{min:'72',player:'Jacob Murphy',side:'a'}]},
  {id:'UCL-PO-06', date:'2026-02-19', time:'04:00', home:'BOD', away:'INT', stage:'playoff', leg:1, status:'finished', score:{h:3,a:1}, stats:{poss:[42.4,57.6],shots:[8,15],sot:[6,4],corners:[3,3],yellow:[1,1],saves:[3,3]}, goals:[{min:'20',player:'Sondre Brunstad Fet',side:'h'},{min:'30',player:'Pio Esposito',side:'a'},{min:'61',player:'Jens Petter Hauge',side:'h'},{min:'64',player:'Kasper Høgh',side:'h'}]},
  {id:'UCL-PO-07', date:'2026-02-19', time:'04:00', home:'BRU', away:'ATM', stage:'playoff', leg:1, status:'finished', score:{h:3,a:3}, stats:{poss:[57.7,42.3],shots:[17,13],sot:[10,4],corners:[4,6],yellow:[1,2],saves:[2,7]}, goals:[{min:'8',player:'Julián Álvarez',side:'a',type:'pen'},{min:'45+4',player:'Ademola Lookman',side:'a'},{min:'51',player:'Raphael Onyedika',side:'h'},{min:'60',player:'Nicolo Tresoldi',side:'h'},{min:'79',player:'Joel Ordóñez',side:'a',type:'og'},{min:'89',player:'Christos Tzolis',side:'h'}]},
  {id:'UCL-PO-08', date:'2026-02-19', time:'04:00', home:'OLY', away:'LEV', stage:'playoff', leg:1, status:'finished', score:{h:0,a:2}, stats:{poss:[42.1,57.9],shots:[13,8],sot:[1,5],corners:[3,3],yellow:[1,1],saves:[3,1]}, goals:[{min:'60',player:'Patrik Schick',side:'a'},{min:'63',player:'Patrik Schick',side:'a'}]},

  // ===== 淘汰賽附加賽 第二回合 (2026-02-25 / 02-26 台灣時間) =====
  {id:'UCL-PO-09', date:'2026-02-25', time:'01:45', home:'ATM', away:'BRU', stage:'playoff', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:7,a:4}, stats:{poss:[45.3,54.7],shots:[14,11],sot:[5,6],corners:[2,7],yellow:[1,2],saves:[5,1]}, goals:[{min:'23',player:'Alexander Sørloth',side:'h'},{min:'36',player:'Joel Ordóñez',side:'a'},{min:'48',player:'Johnny Cardoso',side:'h'},{min:'76',player:'Alexander Sørloth',side:'h'},{min:'87',player:'Alexander Sørloth',side:'h'}]},
  {id:'UCL-PO-10', date:'2026-02-25', time:'04:00', home:'LEV', away:'OLY', stage:'playoff', leg:2, status:'finished', score:{h:0,a:0}, agg:{h:2,a:0}, stats:{poss:[46.7,53.3],shots:[7,7],sot:[1,1],corners:[4,5],yellow:[0,1],saves:[1,1]}, goals:[]},
  {id:'UCL-PO-11', date:'2026-02-25', time:'04:00', home:'INT', away:'BOD', stage:'playoff', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:2,a:5}, stats:{poss:[70.8,29.2],shots:[30,7],sot:[7,5],corners:[16,1],yellow:[0,1],saves:[3,4]}, goals:[{min:'58',player:'Jens Petter Hauge',side:'a'},{min:'72',player:'Hakon Evjen',side:'a'},{min:'76',player:'Alessandro Bastoni',side:'h'}]},
  {id:'UCL-PO-12', date:'2026-02-25', time:'04:00', home:'NEW', away:'QAR', stage:'playoff', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:9,a:3}, stats:{poss:[65.4,34.6],shots:[19,13],sot:[8,6],corners:[9,6],yellow:[0,1],saves:[4,5]}, goals:[{min:'4',player:'Sandro Tonali',side:'h'},{min:'6',player:'Joelinton',side:'h'},{min:'50',player:'Camilo Durán',side:'a'},{min:'52',player:'Sven Botman',side:'h'},{min:'57',player:'Elvin Cafarquliyev',side:'a'}]},
  {id:'UCL-PO-13', date:'2026-02-26', time:'01:45', home:'ATA', away:'DOR', stage:'playoff', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:4,a:3}, stats:{poss:[43.7,56.3],shots:[15,7],sot:[9,4],corners:[5,1],yellow:[1,3],saves:[3,4]}, goals:[{min:'5',player:'Gianluca Scamacca',side:'h'},{min:'45',player:'Davide Zappacosta',side:'h'},{min:'57',player:'Mario Pasalic',side:'h'},{min:'75',player:'Karim Adeyemi',side:'a'},{min:'90+8',player:'Lazar Samardzic',side:'h',type:'pen'}]},
  {id:'UCL-PO-14', date:'2026-02-26', time:'04:00', home:'RMA', away:'BEN', stage:'playoff', leg:2, status:'finished', score:{h:2,a:1}, agg:{h:3,a:1}, stats:{poss:[55.8,44.2],shots:[14,12],sot:[4,4],corners:[4,7],yellow:[2,2],saves:[4,2]}, goals:[{min:'14',player:'Rafa Silva',side:'a'},{min:'16',player:'Aurélien Tchouaméni',side:'h'},{min:'80',player:'Vinícius Júnior',side:'h'}]},
  {id:'UCL-PO-15', date:'2026-02-26', time:'04:00', home:'PSG', away:'MON', stage:'playoff', leg:2, status:'finished', score:{h:2,a:2}, agg:{h:5,a:4}, stats:{poss:[72.6,27.4],shots:[21,10],sot:[6,4],corners:[8,4],yellow:[1,3],saves:[2,4]}, goals:[{min:'45',player:'Maghnes Akliouche',side:'a'},{min:'58',player:'Mamadou Coulibaly',side:'a'},{min:'60',player:'Marquinhos',side:'h'},{min:'66',player:'Khvicha Kvaratskhelia',side:'h'}]},
  {id:'UCL-PO-16', date:'2026-02-26', time:'04:00', home:'JUV', away:'GAL', stage:'playoff', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:5,a:7}, stats:{poss:[47.2,52.8],shots:[28,16],sot:[9,8],corners:[9,4],yellow:[3,4],saves:[6,6]}, goals:[{min:'37',player:'Manuel Locatelli',side:'h',type:'pen'},{min:'49',player:'Lloyd Kelly',side:'a'},{min:'70',player:'Federico Gatti',side:'h'},{min:'82',player:'Weston McKennie',side:'h'},{min:'105+1',player:'Victor Osimhen',side:'a'}]},

  // ===== 十六強 第一回合 (2026-03-11 / 03-12 台灣時間) =====
  // 歐洲 Mar 10-11, 21:00 CET → 台灣 +1天 04:00
  {id:'UCL-R16-01', date:'2026-03-11', time:'04:00', home:'ATA', away:'BAY', stage:'r16', leg:1, status:'finished', score:{h:1,a:6}, stats:{poss:[30.8,69.2],shots:[11,25],sot:[3,13],corners:[2,7],yellow:[1,3],saves:[6,2]}, goals:[{min:'12',player:'Josip Stanisic',side:'a'},{min:'22',player:'Michael Olise',side:'a'},{min:'25',player:'Serge Gnabry',side:'a'},{min:'52',player:'Nicolas Jackson',side:'a'},{min:'64',player:'Michael Olise',side:'a'},{min:'67',player:'Jamal Musiala',side:'a'},{min:'90+3',player:'Mario Pasalic',side:'h'}]},
  {id:'UCL-R16-02', date:'2026-03-11', time:'04:00', home:'ATM', away:'TOT', stage:'r16', leg:1, status:'finished', score:{h:5,a:2}, stats:{poss:[58,42],shots:[11,11],sot:[7,5],corners:[4,2],yellow:[0,5],saves:[3,3]}, goals:[{min:'6',player:'Marcos Llorente',side:'h'},{min:'14',player:'Antoine Griezmann',side:'h'},{min:'15',player:'Julián Álvarez',side:'h'},{min:'22',player:'Robin Le Normand',side:'h'},{min:'26',player:'Pedro Porro',side:'a'},{min:'55',player:'Julián Álvarez',side:'h'},{min:'76',player:'Dominic Solanke',side:'a'}]},
  {id:'UCL-R16-03', date:'2026-03-11', time:'04:00', home:'NEW', away:'BAR', stage:'r16', leg:1, status:'finished', score:{h:1,a:1}, stats:{poss:[45.6,54.4],shots:[16,9],sot:[4,2],corners:[9,4],yellow:[2,1],saves:[1,2]}, goals:[{min:'86',player:'Harvey Barnes',side:'h'},{min:'90+6',player:'Lamine Yamal',side:'a',type:'pen'}]},
  {id:'UCL-R16-04', date:'2026-03-11', time:'04:00', home:'GAL', away:'LIV', stage:'r16', leg:1, status:'finished', score:{h:1,a:0}, stats:{poss:[46.2,53.8],shots:[15,15],sot:[4,6],corners:[7,4],yellow:[1,4],saves:[7,3]}, goals:[{min:'7',player:'Mario Lemina',side:'h'}]},
  {id:'UCL-R16-05', date:'2026-03-12', time:'04:00', home:'LEV', away:'ARS', stage:'r16', leg:1, status:'finished', score:{h:1,a:1}, stats:{poss:[45.3,54.7],shots:[10,6],sot:[3,2],corners:[2,3],yellow:[4,3],saves:[1,2]}, goals:[{min:'46',player:'Robert Andrich',side:'h'},{min:'89',player:'Kai Havertz',side:'a',type:'pen'}]},
  {id:'UCL-R16-06', date:'2026-03-12', time:'04:00', home:'BOD', away:'SCP', stage:'r16', leg:1, status:'finished', score:{h:3,a:0}, stats:{poss:[48.6,51.4],shots:[10,9],sot:[5,2],corners:[4,5],yellow:[2,1],saves:[2,2]}, goals:[{min:'32',player:'Sondre Brunstad Fet',side:'h',type:'pen'},{min:'45+1',player:'Ole Didrik Blomberg',side:'h'},{min:'71',player:'Kasper Høgh',side:'h'}]},
  {id:'UCL-R16-07', date:'2026-03-12', time:'04:00', home:'PSG', away:'CHE', stage:'r16', leg:1, status:'finished', score:{h:5,a:2}, stats:{poss:[58.2,41.8],shots:[9,9],sot:[8,4],corners:[2,3],yellow:[1,0],saves:[2,3]}, goals:[{min:'10',player:'Bradley Barcola',side:'h'},{min:'28',player:'Malo Gusto',side:'a'},{min:'40',player:'Ousmane Dembélé',side:'h'},{min:'57',player:'Enzo Fernández',side:'a'},{min:'74',player:'Vitinha',side:'h'},{min:'86',player:'Khvicha Kvaratskhelia',side:'h'},{min:'90+4',player:'Khvicha Kvaratskhelia',side:'h'}]},
  {id:'UCL-R16-08', date:'2026-03-12', time:'04:00', home:'RMA', away:'MCI', stage:'r16', leg:1, status:'finished', score:{h:3,a:0}, stats:{poss:[40.2,59.8],shots:[12,8],sot:[7,4],corners:[1,10],yellow:[0,2],saves:[4,4]}, goals:[{min:'20',player:'Federico Valverde',side:'h'},{min:'27',player:'Federico Valverde',side:'h'},{min:'42',player:'Federico Valverde',side:'h'}]},

  // ===== 十六強 第二回合 (2026-03-18 / 03-19 台灣時間) =====
  {id:'UCL-R16-09', date:'2026-03-18', time:'04:00', home:'SCP', away:'BOD', stage:'r16', leg:2, status:'finished', score:{h:5,a:0}, agg:{h:5,a:3}, stats:{poss:[66,34],shots:[38,9],sot:[14,3],corners:[16,4],yellow:[3,4],saves:[3,9]}, goals:[{min:'34',player:'Gonçalo Inacio',side:'h'},{min:'61',player:'Pedro Gonçalves',side:'h'},{min:'78',player:'Luis Suárez',side:'h',type:'pen'},{min:'92',player:'Maximiliano Araújo',side:'h'},{min:'120+1',player:'Rafael Nel',side:'h'}]},
  {id:'UCL-R16-10', date:'2026-03-18', time:'04:00', home:'ARS', away:'LEV', stage:'r16', leg:2, status:'finished', score:{h:2,a:0}, agg:{h:3,a:1}, stats:{poss:[41.5,58.5],shots:[21,9],sot:[12,2],corners:[10,8],yellow:[0,1],saves:[2,10]}, goals:[{min:'36',player:'Eberechi Eze',side:'h'},{min:'63',player:'Declan Rice',side:'h'}]},
  {id:'UCL-R16-11', date:'2026-03-18', time:'04:00', home:'CHE', away:'PSG', stage:'r16', leg:2, status:'finished', score:{h:0,a:3}, agg:{h:2,a:8}, stats:{poss:[45.4,54.6],shots:[18,8],sot:[9,5],corners:[9,3],yellow:[0,0],saves:[2,9]}, goals:[{min:'6',player:'Khvicha Kvaratskhelia',side:'a'},{min:'14',player:'Bradley Barcola',side:'a'},{min:'62',player:'Senny Mayulu',side:'a'}]},
  {id:'UCL-R16-12', date:'2026-03-18', time:'04:00', home:'MCI', away:'RMA', stage:'r16', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:1,a:5}, stats:{poss:[47.3,52.7],shots:[22,14],sot:[8,7],corners:[9,6],yellow:[1,2],saves:[4,7]}, goals:[{min:'22',player:'Vinícius Júnior',side:'a',type:'pen'},{min:'41',player:'Erling Haaland',side:'h'},{min:'90+3',player:'Vinícius Júnior',side:'a'}]},
  {id:'UCL-R16-13', date:'2026-03-19', time:'04:00', home:'BAR', away:'NEW', stage:'r16', leg:2, status:'finished', score:{h:7,a:2}, agg:{h:8,a:3}, stats:{poss:[62.8,37.2],shots:[18,8],sot:[13,5],corners:[6,2],yellow:[1,3],saves:[3,6]}, goals:[{min:'6',player:'Raphinha',side:'h'},{min:'15',player:'Anthony Elanga',side:'a'},{min:'18',player:'Marc Bernal',side:'h'},{min:'28',player:'Anthony Elanga',side:'a'},{min:'45+7',player:'Lamine Yamal',side:'h',type:'pen'},{min:'51',player:'Fermín López',side:'h'},{min:'56',player:'Robert Lewandowski',side:'h'},{min:'61',player:'Robert Lewandowski',side:'h'},{min:'72',player:'Raphinha',side:'h'}]},
  {id:'UCL-R16-14', date:'2026-03-19', time:'04:00', home:'LIV', away:'GAL', stage:'r16', leg:2, status:'finished', score:{h:4,a:0}, agg:{h:4,a:1}, stats:{poss:[62.1,37.9],shots:[32,4],sot:[16,1],corners:[6,2],yellow:[0,0],saves:[1,11]}, goals:[{min:'25',player:'Dominik Szoboszlai',side:'h'},{min:'51',player:'Hugo Ekitike',side:'h'},{min:'53',player:'Ryan Gravenberch',side:'h'},{min:'62',player:'Mohamed Salah',side:'h'}]},
  {id:'UCL-R16-15', date:'2026-03-19', time:'04:00', home:'BAY', away:'ATA', stage:'r16', leg:2, status:'finished', score:{h:4,a:1}, agg:{h:10,a:2}, stats:{poss:[70.4,29.6],shots:[25,14],sot:[8,8],corners:[6,3],yellow:[0,0],saves:[7,4]}, goals:[{min:'25',player:'Harry Kane',side:'h',type:'pen'},{min:'54',player:'Harry Kane',side:'h'},{min:'56',player:'Lennart Karl',side:'h'},{min:'70',player:'Luis Díaz',side:'h'},{min:'85',player:'Lazar Samardzic',side:'a'}]},
  {id:'UCL-R16-16', date:'2026-03-19', time:'04:00', home:'TOT', away:'ATM', stage:'r16', leg:2, status:'finished', score:{h:3,a:2}, agg:{h:5,a:7}, stats:{poss:[51.3,48.7],shots:[18,18],sot:[11,6],corners:[7,7],yellow:[4,3],saves:[5,8]}, goals:[{min:'30',player:'Randal Kolo Muani',side:'h'},{min:'47',player:'Julián Álvarez',side:'a'},{min:'52',player:'Xavi Simons',side:'h'},{min:'75',player:'Dávid Hancko',side:'a'},{min:'90',player:'Xavi Simons',side:'h',type:'pen'}]},

  // ===== 八強 第一回合 (2026-04-08 / 04-09 台灣時間) =====
  // 歐洲 Apr 7-8, 21:00 CEST → 台灣 +1天 03:00
  {id:'UCL-QF-01', date:'2026-04-08', time:'03:00', home:'SCP', away:'ARS', stage:'qf', leg:1, status:'finished', score:{h:0,a:1}, stats:{poss:[44.2,55.8],shots:[11,8],sot:[5,4],corners:[3,4],yellow:[1,0],saves:[3,5]}, goals:[{min:'90+1',player:'Kai Havertz',side:'a'}]},
  {id:'UCL-QF-02', date:'2026-04-08', time:'03:00', home:'RMA', away:'BAY', stage:'qf', leg:1, status:'finished', score:{h:1,a:2}, stats:{poss:[48,52],shots:[9,8],sot:[9,8],corners:[8,11],yellow:[1,4],saves:[5,9]}, goals:[{min:'41',player:'Luis Díaz',side:'a'},{min:'46',player:'Harry Kane',side:'a'},{min:'74',player:'Kylian Mbappé',side:'h'}]},
  {id:'UCL-QF-03', date:'2026-04-09', time:'03:00', home:'BAR', away:'ATM', stage:'qf', leg:1, status:'finished', score:{h:0,a:2}, stats:{poss:[58.3,41.7],shots:[18,5],sot:[7,3],corners:[7,1],yellow:[2,3],saves:[1,7]}, goals:[{min:'45',player:'Julián Álvarez',side:'a',type:'fk'},{min:'70',player:'Alexander Sørloth',side:'a'}]},
  {id:'UCL-QF-04', date:'2026-04-09', time:'03:00', home:'PSG', away:'LIV', stage:'qf', leg:1, status:'finished', score:{h:2,a:0}, stats:{poss:[74,26],shots:[18,3],sot:[6,0],corners:[3,1],yellow:[0,2],saves:[0,4]}, goals:[{min:'11',player:'Désiré Doué',side:'h'},{min:'65',player:'Khvicha Kvaratskhelia',side:'h'}]},

  // ===== 八強 第二回合 (2026-04-15 / 04-16 台灣時間) =====
  {id:'UCL-QF-05', date:'2026-04-15', time:'03:00', home:'ATM', away:'BAR', stage:'qf', leg:2, status:'finished', score:{h:1,a:2}, agg:{h:3,a:2}, stats:{poss:[28.9,71.1],shots:[15,15],sot:[5,8],corners:[2,4],yellow:[0,1],saves:[7,4]}, goals:[{min:'4',player:'Lamine Yamal',side:'a'},{min:'24',player:'Ferran Torres',side:'a'},{min:'31',player:'Ademola Lookman',side:'h'}]},
  {id:'UCL-QF-06', date:'2026-04-15', time:'03:00', home:'LIV', away:'PSG', stage:'qf', leg:2, status:'finished', score:{h:0,a:2}, agg:{h:0,a:4}, stats:{poss:[52.6,47.4],shots:[21,12],sot:[5,6],corners:[8,2],yellow:[2,0],saves:[3,6]}, goals:[{min:'72',player:'Ousmane Dembélé',side:'a'},{min:'90+1',player:'Ousmane Dembélé',side:'a'}]},
  {id:'UCL-QF-07', date:'2026-04-16', time:'03:00', home:'ARS', away:'SCP', stage:'qf', leg:2, status:'finished', score:{h:0,a:0}, agg:{h:1,a:0}, stats:{poss:[50.4,49.6],shots:[15,8],sot:[1,1],corners:[8,3],yellow:[0,1],saves:[1,1]}, goals:[]},
  {id:'UCL-QF-08', date:'2026-04-16', time:'03:00', home:'BAY', away:'RMA', stage:'qf', leg:2, status:'finished', score:{h:4,a:3}, agg:{h:6,a:4}, stats:{poss:[68.6,31.4],shots:[21,12],sot:[9,5],corners:[9,2],yellow:[1,2],saves:[2,4]}, goals:[{min:'1',player:'Arda Güler',side:'a'},{min:'6',player:'Aleksandar Pavlovic',side:'h'},{min:'29',player:'Arda Güler',side:'a',type:'fk'},{min:'38',player:'Harry Kane',side:'h'},{min:'42',player:'Kylian Mbappé',side:'a'},{min:'89',player:'Luis Díaz',side:'h'},{min:'90+4',player:'Michael Olise',side:'h'}], events:[{min:'86',player:'Eduardo Camavinga',side:'a',type:'red'},{min:'90+5',player:'Arda Güler',side:'a',type:'red'}]},

  // ===== 四強 (2026-04-29 / 04-30 & 05-06 / 05-07 台灣時間) =====
  {id:'UCL-SF-01', date:'2026-04-29', time:'03:00', home:'PSG', away:'BAY', stage:'sf', leg:1, status:'finished', score:{h:5,a:4}, halfTime:{h:3,a:2}, stats:{poss:[42.6,57.4],shots:[12,10],sot:[5,8],corners:[3,5],yellow:[3,1],saves:[4,0]}, goals:[{min:'17',player:'Harry Kane',side:'a',type:'pen'},{min:'24',player:'Khvicha Kvaratskhelia',side:'h'},{min:'33',player:'João Neves',side:'h'},{min:'41',player:'Michael Olise',side:'a'},{min:'45+5',player:'Ousmane Dembélé',side:'h',type:'pen'},{min:'56',player:'Khvicha Kvaratskhelia',side:'h'},{min:'58',player:'Ousmane Dembélé',side:'h'},{min:'65',player:'Dayot Upamecano',side:'a'},{min:'68',player:'Luis Díaz',side:'a'}]},
  {id:'UCL-SF-02', date:'2026-04-30', time:'03:00', home:'ATM', away:'ARS', stage:'sf', leg:1, status:'scheduled', score:null},
  {id:'UCL-SF-03', date:'2026-05-06', time:'03:00', home:'ARS', away:'ATM', stage:'sf', leg:2, status:'scheduled', score:null},
  {id:'UCL-SF-04', date:'2026-05-07', time:'03:00', home:'BAY', away:'PSG', stage:'sf', leg:2, status:'scheduled', score:null},

  // ===== 決賽 (2026-05-31 03:00 台灣時間 · 布達佩斯普斯卡什球場) =====
  {id:'UCL-F-01', date:'2026-05-31', time:'03:00', home:'TBD', away:'TBD', stage:'final', venue:'Puskás Aréna, Budapest', status:'scheduled', score:null}
];

// ── 聯賽階段最終積分表（已完結）──────────────────────
const UCL_LEAGUE_STANDINGS = [
  {pos:1,  code:'ARS', mp:8, w:8, d:0, l:0, gf:23, ga:4,  gd:19,  pts:24},
  {pos:2,  code:'BAY', mp:8, w:7, d:0, l:1, gf:22, ga:8,  gd:14,  pts:21},
  {pos:3,  code:'LIV', mp:8, w:6, d:0, l:2, gf:20, ga:8,  gd:12,  pts:18},
  {pos:4,  code:'TOT', mp:8, w:5, d:2, l:1, gf:17, ga:7,  gd:10,  pts:17},
  {pos:5,  code:'BAR', mp:8, w:5, d:1, l:2, gf:22, ga:14, gd:8,   pts:16},
  {pos:6,  code:'CHE', mp:8, w:5, d:1, l:2, gf:17, ga:10, gd:7,   pts:16},
  {pos:7,  code:'SCP', mp:8, w:5, d:1, l:2, gf:17, ga:11, gd:6,   pts:16},
  {pos:8,  code:'MCI', mp:8, w:5, d:1, l:2, gf:15, ga:9,  gd:6,   pts:16},
  {pos:9,  code:'RMA', mp:8, w:5, d:0, l:3, gf:21, ga:12, gd:9,   pts:15},
  {pos:10, code:'INT', mp:8, w:5, d:0, l:3, gf:15, ga:7,  gd:8,   pts:15},
  {pos:11, code:'PSG', mp:8, w:4, d:2, l:2, gf:21, ga:11, gd:10,  pts:14},
  {pos:12, code:'NEW', mp:8, w:4, d:2, l:2, gf:17, ga:7,  gd:10,  pts:14},
  {pos:13, code:'JUV', mp:8, w:3, d:4, l:1, gf:14, ga:10, gd:4,   pts:13},
  {pos:14, code:'ATM', mp:8, w:4, d:1, l:3, gf:17, ga:15, gd:2,   pts:13},
  {pos:15, code:'ATA', mp:8, w:4, d:1, l:3, gf:10, ga:10, gd:0,   pts:13},
  {pos:16, code:'LEV', mp:8, w:3, d:3, l:2, gf:13, ga:14, gd:-1,  pts:12},
  {pos:17, code:'DOR', mp:8, w:3, d:2, l:3, gf:19, ga:17, gd:2,   pts:11},
  {pos:18, code:'OLY', mp:8, w:3, d:2, l:3, gf:10, ga:14, gd:-4,  pts:11},
  {pos:19, code:'BRU', mp:8, w:3, d:1, l:4, gf:15, ga:17, gd:-2,  pts:10},
  {pos:20, code:'GAL', mp:8, w:3, d:1, l:4, gf:9,  ga:11, gd:-2,  pts:10},
  {pos:21, code:'MON', mp:8, w:2, d:4, l:2, gf:8,  ga:14, gd:-6,  pts:10},
  {pos:22, code:'QAR', mp:8, w:3, d:1, l:4, gf:13, ga:21, gd:-8,  pts:10},
  {pos:23, code:'BOD', mp:8, w:2, d:3, l:3, gf:14, ga:15, gd:-1,  pts:9},
  {pos:24, code:'BEN', mp:8, w:3, d:0, l:5, gf:10, ga:12, gd:-2,  pts:9},
  {pos:25, code:'MAR', mp:8, w:3, d:0, l:5, gf:11, ga:14, gd:-3,  pts:9},
  {pos:26, code:'PAF', mp:8, w:2, d:3, l:3, gf:8,  ga:11, gd:-3,  pts:9},
  {pos:27, code:'USG', mp:8, w:3, d:0, l:5, gf:8,  ga:17, gd:-9,  pts:9},
  {pos:28, code:'PSV', mp:8, w:2, d:2, l:4, gf:16, ga:16, gd:0,   pts:8},
  {pos:29, code:'ATH', mp:8, w:2, d:2, l:4, gf:9,  ga:14, gd:-5,  pts:8},
  {pos:30, code:'NAP', mp:8, w:2, d:2, l:4, gf:9,  ga:15, gd:-6,  pts:8},
  {pos:31, code:'COP', mp:8, w:2, d:2, l:4, gf:12, ga:21, gd:-9,  pts:8},
  {pos:32, code:'AJA', mp:8, w:2, d:0, l:6, gf:8,  ga:21, gd:-13, pts:6},
  {pos:33, code:'SGE', mp:8, w:1, d:1, l:6, gf:10, ga:21, gd:-11, pts:4},
  {pos:34, code:'SLA', mp:8, w:0, d:3, l:5, gf:5,  ga:19, gd:-14, pts:3},
  {pos:35, code:'VIL', mp:8, w:0, d:1, l:7, gf:5,  ga:18, gd:-13, pts:1},
  {pos:36, code:'KAI', mp:8, w:0, d:1, l:7, gf:7,  ga:22, gd:-15, pts:1}
];

// ── 聯賽階段積分表 ──────────────────────────
function calcUCLStandings() {
  // 直接回傳已確定的最終積分表
  return UCL_LEAGUE_STANDINGS.map(row => ({
    code: row.code,
    mp: row.mp, w: row.w, d: row.d, l: row.l,
    gf: row.gf, ga: row.ga, gd: row.gd, pts: row.pts
  }));
}

// 導出
if (typeof window !== 'undefined') {
  window.UCL_MATCHES = UCL_MATCHES;
  window.UCL_LEAGUE_STANDINGS = UCL_LEAGUE_STANDINGS;
  window.calcUCLStandings = calcUCLStandings;
}
