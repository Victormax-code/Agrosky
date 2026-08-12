const demo = {
  Lagos:{temp:29, condition:"Partly cloudy", icon:"🌤️", humidity:78, wind:12, rain:30, crops:["Maize","Cassava","Okra","Tomato"]},
  Ibadan:{temp:28, condition:"Cloudy", icon:"☁️", humidity:81, wind:10, rain:45, crops:["Maize","Cassava","Pepper","Vegetables"]},
  Abuja:{temp:27, condition:"Sunny", icon:"☀️", humidity:52, wind:15, rain:15, crops:["Maize","Sorghum","Millet","Groundnut"]},
  Kano:{temp:31, condition:"Hot and sunny", icon:"☀️", humidity:34, wind:18, rain:10, crops:["Sorghum","Millet","Tomato","Onion"]}
};

function findWeather(place){
  const key=Object.keys(demo).find(k=>place.toLowerCase().includes(k.toLowerCase()));
  if(key) return {...demo[key], place:key};
  const seed=[...place].reduce((a,c)=>a+c.charCodeAt(0),0);
  return {place,temp:26+(seed%8),condition:"Variable clouds",icon:"🌥️",humidity:55+(seed%25),wind:8+(seed%14),rain:20+(seed%55),crops:["Maize","Beans","Cassava","Vegetables"]};
}
function render(place){
  const w=findWeather(place);
  document.querySelector("#heroTemp").textContent=w.temp+"°C";
  document.querySelector("#heroPlace").textContent=w.place;
  document.querySelector("#currentTemp").textContent=w.temp+"°C";
  document.querySelector("#currentCondition").textContent=w.condition;
  document.querySelector("#weatherIcon").textContent=w.icon;
  document.querySelector("#humidity").textContent=w.humidity+"%";
  document.querySelector("#wind").textContent=w.wind+" km/h";
  document.querySelector("#rain").textContent=w.rain+"%";
  document.querySelector("#status").textContent=`Showing demo conditions for ${w.place}. For production, connect this interface to a weather API.`;
  document.querySelector("#cropList").innerHTML=w.crops.map(c=>`<li>${c}</li>`).join("");
  const days=["Today","Thu","Fri","Sat"];
  document.querySelector("#forecast").innerHTML=days.map((d,i)=>`
    <article class="forecast-card"><div class="day">${d}</div><div class="weather">${i===1?"🌦️":i===2?"☀️":"🌤️"}</div>
    <div class="temp">${w.temp+i-1}°C</div><small>${Math.max(10,w.rain+i*8)}% rain</small></article>`).join("");
  document.querySelector("#alerts").innerHTML=`
    <div class="alert"><b>${w.rain>50?"Heavy rain watch":"Rain watch"}</b><span>${w.rain}% precipitation probability. Plan field work accordingly.</span></div>
    <div class="alert"><b>Wind check</b><span>${w.wind>18?"Higher winds: avoid spraying.":"Conditions suitable for routine field inspection."}</span></div>`;
}
document.querySelector("#searchBtn").addEventListener("click",()=>render(document.querySelector("#locationInput").value.trim()||"Lagos"));
document.querySelector("#locationInput").addEventListener("keydown",e=>{if(e.key==="Enter")document.querySelector("#searchBtn").click()});
document.querySelector(".menu").addEventListener("click",()=>{const n=document.querySelector(".topbar nav");n.style.display=n.style.display==="flex"?"none":"flex";n.style.flexDirection="column";n.style.position="absolute";n.style.top="65px";n.style.right="6%";n.style.background="#fff";n.style.padding="18px";n.style.borderRadius="12px"});
document.querySelector("#contactForm").addEventListener("submit",e=>{e.preventDefault();document.querySelector("#formMsg").textContent="Thanks! Your message has been received in this demo.";e.target.reset()});
render("Lagos");
