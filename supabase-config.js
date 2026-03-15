window.BUSI_SUPABASE = {
url: "",
anonKey: "",

isConfigured: function(){
return Boolean(this.url && this.anonKey && window.supabase);
},

createClient: function(){
if(!this.isConfigured()){
return null;
}
return window.supabase.createClient(this.url, this.anonKey);
}
};
