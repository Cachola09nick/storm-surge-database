(() => {
  let allData = Array.isArray(window.STORM_SURGE_DATA) ? [...window.STORM_SURGE_DATA] : [];
  const savedData = localStorage.getItem("stormSurgeAdminData");
  if (savedData) {
    try { allData = JSON.parse(savedData); } catch (e) { console.warn("Saved database could not be read.", e); }
  }
  let isAdmin = sessionStorage.getItem("stormSurgeAdmin") === "1";
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "SurgeM2026!";
  let filtered = [...allData], page = 1;
  const pageSize = 25;
  let map = null, markersLayer = null, markerById = new Map();

  const $ = id => document.getElementById(id);
  const clean = v => v == null ? "" : String(v).trim();
  const unique = arr => [...new Set(arr.map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b));

  function setOptions(el, values, firstLabel) {
    const current = el.value;
    el.innerHTML = `<option value="">${firstLabel}</option>` +
      values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    if (values.includes(current)) el.value = current;
  }

  function escapeHtml(s) {
    return clean(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function initFilters() {
    setOptions($("province"), unique(allData.map(r=>r.prov)), "All provinces");
    setOptions($("typhoon"), unique(allData.flatMap(r=>[r.intl_name,r.local_name])), "All typhoons");
    setOptions($("category"), unique(allData.map(r=>r.tc_categor)), "All categories");
    refreshLocationFilters();
  }

  function refreshLocationFilters() {
    const prov = $("province").value;
    const muni = $("municipality").value;
    let rows = prov ? allData.filter(r=>clean(r.prov)===prov) : allData;
    setOptions($("municipality"), unique(rows.map(r=>r.city_muni)), "All municipalities / cities");
    if (muni && $("municipality").value !== muni) $("municipality").value = "";
    const selectedMuni = $("municipality").value;
    if (selectedMuni) rows = rows.filter(r=>clean(r.city_muni)===selectedMuni);
    setOptions($("barangay"), unique(rows.map(r=>r.brgy)), "All barangays");
  }

  function initMap() {
    if (!window.L) {
      $("mapError").classList.remove("hidden");
      return;
    }
    map = L.map("map", { zoomControl:true }).setView([12.3, 122.0], 5);
    const tiles = L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
      subdomains: "abc",
      maxZoom: 17,
      attribution: 'Map data &copy; OpenStreetMap contributors | Map style &copy; OpenTopoMap'
    });
    tiles.on("tileerror", ()=> $("mapError").classList.remove("hidden"));
    tiles.addTo(map);
    markersLayer = L.layerGroup().addTo(map);
  }

  function markerColor(height) {
    const h = Number(height);
    if (!Number.isFinite(h)) return "#6b7280";
    if (h <= 2.0) return "#f4d03f";
    if (h <= 3.0) return "#f28c28";
    return "#d62728";
  }

  function popup(r) {
    return `<div class="popup-title">${escapeHtml(r.local_name || r.intl_name || "Storm Surge Observation")}</div>
      <b>Province:</b> ${escapeHtml(r.prov)}<br>
      <b>Municipality/City:</b> ${escapeHtml(r.city_muni)}<br>
      <b>Barangay:</b> ${escapeHtml(r.brgy)}<br>
      <b>International name:</b> ${escapeHtml(r.intl_name)}<br>
      <b>Local name:</b> ${escapeHtml(r.local_name)}<br>
      <b>Category:</b> ${escapeHtml(r.tc_categor)}<br>
      <b>Date:</b> ${escapeHtml(r.date_from)}${r.date_to ? " – "+escapeHtml(r.date_to) : ""}<br>
      <b>Observed height:</b> ${escapeHtml(r.obs_height)} m<br>
      <b>Range:</b> ${escapeHtml(r.range)}<br>
      <b>Type:</b> ${escapeHtml(r.type)}<br>
      <b>Coordinates:</b> ${escapeHtml(r.latitude)}, ${escapeHtml(r.longitude)}`;
  }

  function renderMap(fit=false) {
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();
    markerById.clear();
    const bounds = [];
    filtered.forEach((r,i) => {
      const lat=Number(r.latitude), lng=Number(r.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker=L.circleMarker([lat,lng],{
        radius:7,color:"#fff",weight:1.5,fillColor:markerColor(r.obs_height),fillOpacity:.9
      }).bindPopup(popup(r));
      marker.addTo(markersLayer);
      markerById.set(String(r.OBJECTID ?? i), marker);
      bounds.push([lat,lng]);
    });
    if (fit && bounds.length) map.fitBounds(bounds,{padding:[30,30],maxZoom:11});
  }

  function applyFilters(fit=true) {
    const prov=$("province").value, muni=$("municipality").value, brgy=$("barangay").value;
    const ty=$("typhoon").value, cat=$("category").value;
    const min=$("minHeight").value==="" ? null : Number($("minHeight").value);
    const max=$("maxHeight").value==="" ? null : Number($("maxHeight").value);
    const q=$("keyword").value.trim().toLowerCase();

    filtered = allData.filter(r => {
      const h=Number(r.obs_height);
      const text=[r.prov,r.city_muni,r.brgy,r.tc_categor,r.intl_name,r.local_name,r.type,r.date_from,r.date_to].map(clean).join(" ").toLowerCase();
      return (!prov || clean(r.prov)===prov) &&
        (!muni || clean(r.city_muni)===muni) &&
        (!brgy || clean(r.brgy)===brgy) &&
        (!ty || clean(r.intl_name)===ty || clean(r.local_name)===ty) &&
        (!cat || clean(r.tc_categor)===cat) &&
        (min===null || (Number.isFinite(h) && h>=min)) &&
        (max===null || (Number.isFinite(h) && h<=max)) &&
        (!q || text.includes(q));
    });
    page=1;
    $("resultCount").textContent=filtered.length.toLocaleString();
    renderTable();
    renderMap(fit);
  }

  function renderTable() {
    const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
    page=Math.min(page,totalPages);
    const start=(page-1)*pageSize;
    const rows=filtered.slice(start,start+pageSize);
    $("resultsBody").innerHTML = rows.length ? rows.map((r,i)=>`
      <tr data-id="${escapeHtml(r.OBJECTID ?? start+i)}">
        <td>${escapeHtml(r.prov)}</td><td>${escapeHtml(r.city_muni)}</td><td>${escapeHtml(r.brgy)}</td>
        <td>${escapeHtml(r.date_from)}</td><td>${escapeHtml(r.tc_categor)}</td>
        <td>${escapeHtml(r.intl_name)}</td><td>${escapeHtml(r.local_name)}</td>
        <td>${escapeHtml(r.obs_height)}</td><td>${escapeHtml(r.range)}</td><td>${escapeHtml(r.type)}</td>
        <td class="admin-only ${isAdmin ? "" : "hidden"}"><div class="action-cell">
          <button class="edit-row" data-objectid="${escapeHtml(r.OBJECTID ?? "")}">Edit</button>
          <button class="delete-row" data-objectid="${escapeHtml(r.OBJECTID ?? "")}">Delete</button>
        </div></td>
      </tr>`).join("") : `<tr><td colspan="${isAdmin ? 11 : 10}">No matching records.</td></tr>`;
    $("pageInfo").textContent=`Page ${page} of ${totalPages}`;
    $("prevBtn").disabled=page<=1;
    $("nextBtn").disabled=page>=totalPages;

    document.querySelectorAll("#resultsBody tr[data-id]").forEach(tr=>{
      tr.addEventListener("click",()=>{
        const marker=markerById.get(tr.dataset.id);
        if(marker && map){ map.setView(marker.getLatLng(),12); marker.openPopup(); }
      });
    });
  }

  function csvEscape(v) {
    const s=clean(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }

  function downloadCSV() {
    if (!filtered.length) return alert("There are no records to download.");
    const cols=["OBJECTID","prov","city_muni","brgy","date_from","date_to","time","tc_categor","intl_name","local_name","latitude","longitude","obs_height","range","type"];
    const csv=[cols.join(","),...filtered.map(r=>cols.map(c=>csvEscape(r[c])).join(","))].join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download=`storm_surge_filtered_${filtered.length}_records.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }


  function persistDatabase() {
    localStorage.setItem("stormSurgeAdminData", JSON.stringify(allData));
  }

  function refreshAdminUI() {
    $("adminBar").classList.toggle("hidden", !isAdmin);
    $("adminBtn").textContent = isAdmin ? "Admin: Signed In" : "Admin Access";
    document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin));
    renderTable();
  }

  function openModal(id) { $(id).classList.remove("hidden"); }
  function closeModal(id) { $(id).classList.add("hidden"); }

  function nextObjectId() {
    return allData.reduce((m,r)=>Math.max(m, Number(r.OBJECTID)||0), 0) + 1;
  }

  function findRecordByObjectId(id) {
    return allData.findIndex(r => String(r.OBJECTID) === String(id));
  }

  function openEditor(recordIndex = -1) {
    if (!isAdmin) return;
    const r = recordIndex >= 0 ? allData[recordIndex] : {};
    $("editorTitle").textContent = recordIndex >= 0 ? "Edit Storm Surge Record" : "Add Storm Surge Record";
    $("editIndex").value = recordIndex;
    $("fProv").value = clean(r.prov); $("fMuni").value = clean(r.city_muni); $("fBrgy").value = clean(r.brgy);
    $("fDateFrom").value = clean(r.date_from); $("fDateTo").value = clean(r.date_to); $("fTime").value = clean(r.time);
    $("fCategory").value = clean(r.tc_categor); $("fIntl").value = clean(r.intl_name); $("fLocal").value = clean(r.local_name);
    $("fLat").value = clean(r.latitude); $("fLng").value = clean(r.longitude); $("fHeight").value = clean(r.obs_height);
    $("fRange").value = clean(r.range); $("fType").value = clean(r.type);
    openModal("editorModal");
  }

  function saveRecord(e) {
    e.preventDefault();
    if (!isAdmin) return;
    const idx = Number($("editIndex").value);
    const old = idx >= 0 ? allData[idx] : {};
    const record = {
      OBJECTID: old.OBJECTID || nextObjectId(),
      prov: $("fProv").value.trim(),
      city_muni: $("fMuni").value.trim(),
      brgy: $("fBrgy").value.trim(),
      date_from: $("fDateFrom").value.trim(),
      date_to: $("fDateTo").value.trim(),
      time: $("fTime").value.trim(),
      tc_categor: $("fCategory").value.trim(),
      intl_name: $("fIntl").value.trim(),
      local_name: $("fLocal").value.trim(),
      latitude: Number($("fLat").value),
      longitude: Number($("fLng").value),
      obs_height: $("fHeight").value === "" ? "" : Number($("fHeight").value),
      range: $("fRange").value.trim(),
      type: $("fType").value.trim()
    };
    if (idx >= 0) allData[idx] = record; else allData.push(record);
    persistDatabase();
    closeModal("editorModal");
    initFilters();
    applyFilters(true);
  }

  function deleteRecord(objectId) {
    if (!isAdmin) return;
    const idx = findRecordByObjectId(objectId);
    if (idx < 0) return;
    const r = allData[idx];
    if (!confirm(`Delete this record?\n${clean(r.prov)} / ${clean(r.city_muni)} / ${clean(r.brgy)}`)) return;
    allData.splice(idx,1);
    persistDatabase();
    initFilters();
    applyFilters(false);
  }

  function exportDatabase() {
    if (!isAdmin) return;
    const cols=["OBJECTID","prov","city_muni","brgy","date_from","date_to","time","tc_categor","intl_name","local_name","latitude","longitude","obs_height","range","type"];
    const csv=[cols.join(","),...allData.map(r=>cols.map(c=>csvEscape(r[c])).join(","))].join("\r\n");
    const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url; a.download="historical_storm_surge_database_updated.csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  $("adminBtn").addEventListener("click",()=>{
    if (isAdmin) return refreshAdminUI();
    $("adminUser").value=""; $("adminPass").value=""; $("loginError").textContent="";
    openModal("adminModal");
  });
  $("loginBtn").addEventListener("click",()=>{
    if ($("adminUser").value === ADMIN_USER && $("adminPass").value === ADMIN_PASS) {
      isAdmin = true; sessionStorage.setItem("stormSurgeAdmin","1"); closeModal("adminModal"); refreshAdminUI();
    } else $("loginError").textContent = "Invalid administrator username or password.";
  });
  $("adminPass").addEventListener("keydown",e=>{ if(e.key==="Enter") $("loginBtn").click(); });
  $("logoutBtn").addEventListener("click",()=>{isAdmin=false;sessionStorage.removeItem("stormSurgeAdmin");refreshAdminUI();});
  $("addRecordBtn").addEventListener("click",()=>openEditor(-1));
  $("saveDatabaseBtn").addEventListener("click",exportDatabase);
  $("recordForm").addEventListener("submit",saveRecord);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  document.addEventListener("click",e=>{
    const edit=e.target.closest(".edit-row"), del=e.target.closest(".delete-row");
    if(edit){ const idx=findRecordByObjectId(edit.dataset.objectid); if(idx>=0) openEditor(idx); }
    if(del) deleteRecord(del.dataset.objectid);
  });

  $("province").addEventListener("change",()=>{refreshLocationFilters(); applyFilters(false);});
  $("municipality").addEventListener("change",()=>{refreshLocationFilters(); applyFilters(false);});
  $("barangay").addEventListener("change",()=>applyFilters(false));
  $("typhoon").addEventListener("change",()=>applyFilters(false));
  $("category").addEventListener("change",()=>applyFilters(false));
  $("searchBtn").addEventListener("click",()=>applyFilters(true));
  $("keyword").addEventListener("keydown",e=>{if(e.key==="Enter") applyFilters(true);});
  $("resetBtn").addEventListener("click",()=>{
    document.querySelectorAll(".filters select,.filters input").forEach(el=>el.value="");
    refreshLocationFilters(); applyFilters(true);
  });
  $("downloadBtn").addEventListener("click",downloadCSV);
  $("fitBtn").addEventListener("click",()=>renderMap(true));
  $("prevBtn").addEventListener("click",()=>{if(page>1){page--;renderTable();}});
  $("nextBtn").addEventListener("click",()=>{if(page*pageSize<filtered.length){page++;renderTable();}});

  initFilters();
  initMap();
  $("resultCount").textContent=allData.length.toLocaleString();
  renderTable();
  renderMap(true);
  refreshAdminUI();
})();