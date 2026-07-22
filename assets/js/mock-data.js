(() => {
  const iso = (offset = 0) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  window.LASHFLOW_DATA = {
    today: iso(0),
    services: [
      {id:1,name:"Clásicas",category:"Pestañas",duration:120,prep:10,cleanup:10,price:150000,color:"#A66C83"},
      {id:2,name:"Híbridas",category:"Pestañas",duration:150,prep:10,cleanup:10,price:190000,color:"#8F79A8"},
      {id:3,name:"Volumen ruso",category:"Pestañas",duration:180,prep:15,cleanup:15,price:240000,color:"#C08E45"},
      {id:4,name:"Mega volumen",category:"Pestañas",duration:240,prep:15,cleanup:15,price:320000,color:"#6F5C8A"},
      {id:5,name:"Lifting",category:"Pestañas",duration:60,prep:5,cleanup:10,price:120000,color:"#5E8B7B"},
      {id:6,name:"Retoque",category:"Pestañas",duration:80,prep:5,cleanup:10,price:130000,color:"#C16B73"},
      {id:7,name:"Retiro",category:"Pestañas",duration:35,prep:5,cleanup:10,price:70000,color:"#7A8B91"},
      {id:8,name:"Uñas semipermanentes",category:"Manos",duration:90,prep:10,cleanup:10,price:100000,color:"#5E82A6"},
      {id:9,name:"Perfilado de cejas",category:"Cejas",duration:45,prep:5,cleanup:10,price:80000,color:"#A6795B",description:"Diseño y perfilado adaptado al rostro."},
      {id:10,name:"Laminado de cejas",category:"Cejas",duration:70,prep:10,cleanup:10,price:140000,color:"#94705E",description:"Peinado y definición de cejas con acabado duradero."},
      {id:11,name:"Pedicure",category:"Pies",duration:75,prep:10,cleanup:15,price:120000,color:"#5D8F91",description:"Cuidado general y esmaltado de pies."},
      {id:12,name:"Spa de pies",category:"Pies",duration:60,prep:10,cleanup:15,price:100000,color:"#6A8C7D",description:"Limpieza, exfoliación e hidratación de pies."}
    ],
    appointments: [
      {id:101,date:iso(0),time:"08:30",clientId:1,client:"María Gómez",serviceId:3,source:"WhatsApp",status:"confirmed",deposit:50000,notes:"Usar adhesivo sensible.",phone:"0981 234 567",formStatus:"complete"},
      {id:102,date:iso(0),time:"12:00",clientId:2,client:"Ana López",serviceId:6,source:"Página web",status:"confirmed",deposit:50000,notes:"Retoque de 3 semanas.",phone:"0972 445 121",formStatus:"complete"},
      {id:103,date:iso(0),time:"14:00",clientId:3,client:"Sofía Benítez",serviceId:5,source:"Instagram",status:"pending",deposit:0,notes:"Primera visita.",phone:"0984 903 115",formStatus:"pending"},
      {id:104,date:iso(0),time:"16:00",clientId:4,client:"Lucía Vera",serviceId:1,source:"WhatsApp",status:"confirmed",deposit:50000,notes:"Prefiere resultado natural.",phone:"0991 522 411",formStatus:"complete"},
      {id:105,date:iso(1),time:"09:00",clientId:5,client:"Carla Ortiz",serviceId:4,source:"Página web",status:"confirmed",deposit:100000,notes:"Mega volumen.",phone:"0982 781 232",formStatus:"complete"},
      {id:106,date:iso(1),time:"14:00",clientId:6,client:"Paola Rojas",serviceId:8,source:"WhatsApp",status:"pending",deposit:0,notes:"Color nude.",phone:"0971 811 650",formStatus:"pending"}
    ],
    clients: [
      {id:1,name:"María Gómez",birthDate:"1997-04-12",birthdayMarketingConsent:true,address:"San Lorenzo",phone:"0981 234 567",email:"maria@example.com",instagram:"@mariag",firstTime:false,last:"26 jun",favorite:"Volumen ruso",visits:14,spent:2920000,note:"Adhesivo sensible",formStatus:"complete"},
      {id:2,name:"Ana López",birthDate:"1999-09-03",birthdayMarketingConsent:true,address:"Fernando de la Mora",phone:"0972 445 121",email:"ana@example.com",instagram:"@anal",firstTime:false,last:"27 jun",favorite:"Retoque",visits:9,spent:1310000,note:"Prefiere 12-13-14 mm",formStatus:"complete"},
      {id:3,name:"Sofía Benítez",birthDate:"2002-07-23",birthdayMarketingConsent:true,address:"",phone:"0984 903 115",email:"",instagram:"@sofib",firstTime:true,last:"Primera cita",favorite:"Lifting",visits:0,spent:0,note:"Sin ficha técnica",formStatus:"pending"},
      {id:4,name:"Lucía Vera",birthDate:"2000-01-22",birthdayMarketingConsent:true,address:"Luque",phone:"0991 522 411",email:"lucia@example.com",instagram:"@lucia.v",firstTime:false,last:"2 jul",favorite:"Clásicas",visits:6,spent:850000,note:"Estilo natural",formStatus:"complete"},
      {id:5,name:"Carla Ortiz",birthDate:"1996-06-18",birthdayMarketingConsent:true,address:"Asunción",phone:"0982 781 232",email:"carla@example.com",instagram:"@carlaortiz",firstTime:false,last:"18 jun",favorite:"Mega volumen",visits:11,spent:3010000,note:"Curvatura D",formStatus:"complete"},
      {id:6,name:"Paola Rojas",birthDate:"1998-07-27",birthdayMarketingConsent:true,address:"",phone:"0971 811 650",email:"",instagram:"",firstTime:false,last:"10 jul",favorite:"Uñas",visits:4,spent:390000,note:"Tonos nude",formStatus:"pending"}
    ],
    records: [
      {
        clientId:1,
        updatedAt:iso(-12),
        medical:{dryEyes:true,seasonalAllergies:true,medications:false,contactLenses:true,eyeMedication:false,eyeSurgery:false,cosmeticProcedures:false,alopecia:false,trichotillomania:false,thyroid:false,ironDeficiency:false,lowDefenses:false,oilySkin:false,frequentMakeup:true,facialCreams:true,extremeStress:false,pregnant:false,canLieDown:true,rubsEyes:false,glasses:false,productAllergy:true,notes:"Reacción previa a un adhesivo fuerte. Trabajar con adhesivo sensible y observar."},
        preferences:{length:"Largas",thickness:"Finas",use:"Uso a largo plazo",color:"Negras",occasion:"",notes:"Quiere volumen pero sin cerrar demasiado la mirada."},
        anatomy:{eyeShape:"Ascendente",naturalThickness:"Fino",naturalCurve:"Curva",direction:"Recta",density:"Estándar"},
        consent:{accepted:true,signedName:"María Gómez",signedAt:iso(-12),version:"1.0"},
        design:{technique:"Volumen ruso",effect:"Foxy 5D",design:"Ardilla",thickness:"0.07",curvature:"M",volume:"5D",range:"8–12 mm",left:[8,9,10,11,12,11],right:[11,12,11,10,9,8],notes:"Transición suave. No sobrecargar esquina interna."}
      },
      {
        clientId:2,
        updatedAt:iso(-8),
        medical:{dryEyes:false,seasonalAllergies:false,medications:false,contactLenses:false,eyeMedication:false,eyeSurgery:false,cosmeticProcedures:false,alopecia:false,trichotillomania:false,thyroid:false,ironDeficiency:false,lowDefenses:false,oilySkin:true,frequentMakeup:true,facialCreams:true,extremeStress:false,pregnant:false,canLieDown:true,rubsEyes:true,glasses:false,productAllergy:false,notes:"Recordar limpieza diaria y evitar frotar."},
        preferences:{length:"Largas",thickness:"Gruesas",use:"Uso a largo plazo",color:"Negras",occasion:"",notes:"Le gusta que se note el efecto."},
        anatomy:{eyeShape:"Redondo",naturalThickness:"Estándar",naturalCurve:"Mixta",direction:"Descendente",density:"Mucha"},
        consent:{accepted:true,signedName:"Ana López",signedAt:iso(-8),version:"1.0"},
        design:{technique:"Retoque híbrido",effect:"Wispy",design:"Muñeca",thickness:"0.07 / 0.15",curvature:"C + D",volume:"Híbrido",range:"10–14 mm",left:[10,11,12,14,13,11],right:[11,13,14,12,11,10],notes:"Mantener picos livianos."}
      },
      {
        clientId:4,
        updatedAt:iso(-3),
        medical:{dryEyes:false,seasonalAllergies:false,medications:false,contactLenses:false,eyeMedication:false,eyeSurgery:false,cosmeticProcedures:false,alopecia:false,trichotillomania:false,thyroid:false,ironDeficiency:false,lowDefenses:false,oilySkin:false,frequentMakeup:false,facialCreams:false,extremeStress:false,pregnant:false,canLieDown:true,rubsEyes:false,glasses:true,productAllergy:false,notes:"Usa anteojos: evitar largos que rocen el cristal."},
        preferences:{length:"Cortas",thickness:"Finas",use:"Uso a largo plazo",color:"Negras",occasion:"",notes:"Resultado muy natural."},
        anatomy:{eyeShape:"Estrecho",naturalThickness:"Fino",naturalCurve:"Recta",direction:"Ascendente",density:"Poca"},
        consent:{accepted:true,signedName:"Lucía Vera",signedAt:iso(-3),version:"1.0"},
        design:{technique:"Clásicas",effect:"Natural",design:"Open eye",thickness:"0.15",curvature:"C",volume:"1D",range:"7–10 mm",left:[7,8,9,10,9,8],right:[8,9,10,9,8,7],notes:"No superar 10 mm."}
      }
    ],
    visits: [
      {id:201,clientId:1,date:iso(-42),serviceId:3,professional:"ByAlee",source:"WhatsApp",price:240000,design:"Foxy 5D",range:"8–12 mm",curvature:"M",notes:"Retención buena. Sin reacción."},
      {id:202,clientId:1,date:iso(-21),serviceId:6,professional:"ByAlee",source:"WhatsApp",price:130000,design:"Retoque Foxy",range:"8–12 mm",curvature:"M",notes:"Limpieza correcta."},
      {id:203,clientId:2,date:iso(-24),serviceId:2,professional:"ByAlee",source:"Página web",price:190000,design:"Wispy",range:"10–14 mm",curvature:"C + D",notes:"Recomendado no frotar."},
      {id:204,clientId:4,date:iso(-18),serviceId:1,professional:"ByAlee",source:"Instagram",price:150000,design:"Natural",range:"7–10 mm",curvature:"C",notes:"Longitud cómoda con anteojos."}
    ],
    inventory: [
      {id:1,name:"Adhesivo Sensitive Pro",stock:2,min:4,unit:"unidades",category:"Adhesivos",priority:"professional",location:"Estación principal"},
      {id:2,name:"Parches de gel",stock:5,min:10,unit:"pares",category:"Accesorios",priority:"professional",location:"Cajón 1"},
      {id:3,name:"Pestañas 0.07 D",stock:8,min:5,unit:"bandejas",category:"Pestañas",priority:"professional",location:"Estante de pestañas"},
      {id:4,name:"Microbrush",stock:22,min:15,unit:"paquetes",category:"Accesorios",priority:"professional",location:"Cajón 2"},
      {id:5,name:"Primer profesional",stock:3,min:3,unit:"unidades",category:"Preparación",priority:"professional",location:"Estación principal"},
      {id:6,name:"Removedor en crema",stock:6,min:3,unit:"unidades",category:"Retiro",priority:"professional",location:"Estación principal"},
      {id:7,name:"Desinfectante de superficies",stock:4,min:2,unit:"botellas",category:"Limpieza",priority:"general",location:"Depósito"},
      {id:8,name:"Guantes descartables",stock:3,min:2,unit:"cajas",category:"Higiene",priority:"general",location:"Depósito"}
    ],
    availabilityBlocks: [
      {id:1,date:iso(4),allDay:false,startTime:"15:00",endTime:"20:00",reason:"Evento personal",source:"manual"}
    ],
    maintenance: [
      {client:"Rocío Acosta",date:iso(1),lastService:"Volumen ruso"},
      {client:"Micaela Díaz",date:iso(3),lastService:"Clásicas"},
      {client:"Laura Ferreira",date:iso(5),lastService:"Híbridas"}
    ]
  };
})();
