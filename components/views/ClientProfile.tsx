
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    X, User, Phone, Mail, Calendar, Edit2, Save, 
    ArrowLeft, Globe, ShoppingBag, History, MoreVertical,
    Plus, CheckCircle, MapPin, Tag, Smartphone, MessageCircle,
    CreditCard, Briefcase, Home, Map, Hash, Info, Settings, 
    Camera, Loader2, FileText, Activity, AlertCircle, Maximize2,
    Trash2, PenTool, Eraser, Check, Image as ImageIcon
} from 'lucide-react';
import Card from '../shared/Card';
import ToggleSwitch from '../shared/ToggleSwitch';
import { Client } from '../../types';
import { differenceInYears, parseISO, isValid, format } from 'date-fns';
import { ptBR as pt } from 'date-fns/locale/pt-BR';
import { supabase } from '../../services/supabaseClient';

interface ClientProfileProps {
    client: Client;
    onClose: () => void;
    onSave: (client: any) => Promise<void>;
}

// --- Componente Interno: Assinatura Digital ---
const SignaturePad = ({ onSave }: { onSave: (blob: Blob) => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
    }, []);

    const startDrawing = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: any) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const clear = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleConfirm = () => {
        canvasRef.current?.toBlob((blob) => {
            if (blob) onSave(blob);
        });
    };

    return (
        <div className="space-y-3">
            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden h-40 touch-none">
                <canvas 
                    ref={canvasRef}
                    width={500}
                    height={200}
                    className="w-full h-full cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={() => setIsDrawing(false)}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={() => setIsDrawing(false)}
                />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none text-[9px] font-black text-slate-300 uppercase tracking-widest">Assine aqui</div>
            </div>
            <div className="flex gap-2">
                <button onClick={clear} className="flex-1 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Eraser size={14}/> Limpar</button>
                <button onClick={handleConfirm} className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Check size={14}/> Salvar Assinatura</button>
            </div>
        </div>
    );
};

const ReadField = ({ label, value, icon: Icon, span = "col-span-1" }: any) => (
    <div className={`flex items-start gap-3 py-3 border-b border-slate-50 last:border-0 group ${span}`}>
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors flex-shrink-0 flex-shrink-0 mt-1">
            <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-700 truncate">{value || '---'}</p>
        </div>
    </div>
);

const EditField = ({ label, name, value, onChange, type = "text", placeholder, span = "col-span-1" }: any) => (
    <div className={`space-y-1 ${span}`}>
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">{label}</label>
        <input 
            type={type}
            name={name}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-400 transition-all"
        />
    </div>
);

const ClientProfile: React.FC<ClientProfileProps> = ({ client, onClose, onSave }) => {
    const isNew = !client.id;
    const [isEditing, setIsEditing] = useState(isNew);
    const [isUploading, setIsUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'anamnese' | 'fotos' | 'historico'>('geral');
    const [zoomImage, setZoomImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoInputRef = useRef<HTMLInputElement>(null);
    
    // --- State: Prontuário (Anamnese) ---
    const [anamnesis, setAnamnesis] = useState<any>({
        has_allergy: false,
        allergy_details: '',
        is_pregnant: false,
        uses_meds: false,
        meds_details: '',
        clinical_notes: '',
        signed_at: null
    });

    const [photos, setPhotos] = useState<any[]>([]);

    const [formData, setFormData] = useState<any>({
        nome: client.nome || '',
        apelido: (client as any).apelido || '',
        whatsapp: client.whatsapp || '',
        email: client.email || '',
        nascimento: client.nascimento || '',
        cpf: (client as any).cpf || '',
        rg: (client as any).rg || '',
        sexo: (client as any).sexo || '',
        profissao: (client as any).profissao || '',
        cep: (client as any).cep || '',
        endereco: (client as any).endereco || '',
        numero: (client as any).numero || '',
        bairro: (client as any).bairro || '',
        cidade: (client as any).cidade || '',
        estado: (client as any).estado || '',
        photo_url: (client as any).photo_url || null,
        online_booking_enabled: (client as any).online_booking_enabled ?? true,
        origem: (client as any).origem || 'Instagram',
        id: client.id || null,
        total_appointments: (client as any).total_appointments || 0,
        avg_ticket: (client as any).avg_ticket || 0,
        balance: (client as any).balance || 0
    });

    useEffect(() => {
        if (client.id) {
            fetchAnamnesis();
            fetchPhotos();
        }
    }, [client.id]);

    const fetchAnamnesis = async () => {
        const { data } = await supabase.from('client_anamnesis').select('*').eq('client_id', client.id).maybeSingle();
        if (data) setAnamnesis(data);
    };

    const fetchPhotos = async () => {
        const { data } = await supabase.from('client_photos').select('*').eq('client_id', client.id).order('created_at', { ascending: false });
        if (data) setPhotos(data);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSaveAnamnesis = async () => {
        const payload = { ...anamnesis, client_id: client.id };
        const { error } = await supabase.from('client_anamnesis').upsert(payload);
        if (!error) alert("Ficha de anamnese salva!");
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !client.id) return;
        setIsUploading(true);
        try {
            const fileName = `evolution_${client.id}_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('client-evolution').upload(fileName, file);
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage.from('client-evolution').getPublicUrl(fileName);
            await supabase.from('client_photos').insert([{ client_id: client.id, url: publicUrl, type: 'depois' }]);
            fetchPhotos();
        } finally {
            setIsUploading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const fileName = `avatar_${formData.id || 'new'}_${Date.now()}`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
            if (uploadError) throw uploadError;
            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setFormData((prev: any) => ({ ...prev, photo_url: publicUrl }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        const payload = { ...formData };
        if (isNew) delete payload.id;
        await onSave(payload);
        setIsEditing(false);
    };

    const clientAge = useMemo(() => {
        if (!formData.nascimento) return null;
        try {
            const date = parseISO(formData.nascimento);
            if (!isValid(date)) return null;
            return differenceInYears(new Date(), date);
        } catch { return null; }
    }, [formData.nascimento]);

    return (
        <div className="fixed inset-0 bg-slate-100 z-[100] flex flex-col font-sans animate-in slide-in-from-right duration-300">
            {/* HEADER */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col gap-6 shadow-sm z-10">
                <div className="flex items-center justify-between">
                    <button onClick={onClose} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-orange-50 hover:text-orange-600 transition-all border border-slate-100 shadow-sm">
                                <Edit2 size={20} />
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={() => !isNew ? setIsEditing(false) : onClose()} className="px-4 py-2.5 text-slate-500 font-bold text-sm">Cancelar</button>
                                <button type="button" onClick={handleSave} className="px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-orange-100 transition-all active:scale-95">
                                    <Save size={18} /> {isNew ? 'Criar Cliente' : 'Salvar Alterações'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <div className="relative group">
                        <div 
                            onClick={() => isEditing && fileInputRef.current?.click()}
                            className={`w-20 h-20 rounded-[24px] flex items-center justify-center text-2xl font-black border-4 border-white shadow-xl overflow-hidden transition-all ${isEditing ? 'cursor-pointer hover:brightness-90 ring-2 ring-orange-100' : ''} ${formData.photo_url ? 'bg-white' : 'bg-orange-100 text-orange-600'}`}
                        >
                            {isUploading ? <Loader2 className="animate-spin text-orange-500" /> : formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" alt="Avatar" /> : formData.nome?.charAt(0) || '?'}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                        
                        {anamnesis.has_allergy && (
                            <div className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full border-2 border-white shadow-sm animate-pulse">
                                <AlertCircle size={14} />
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-slate-800 leading-tight">{formData.nome || 'Novo Cliente'}</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">{formData.origem}</span>
                            {anamnesis.has_allergy && <span className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">⚠️ Alérgica</span>}
                        </div>
                    </div>
                </div>
            </header>

            {/* NAVIGATION */}
            <nav className="bg-white border-b border-slate-200 flex px-6 flex-shrink-0 overflow-x-auto scrollbar-hide">
                <button onClick={() => setActiveTab('geral')} className={`py-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'geral' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Dados</button>
                <button onClick={() => setActiveTab('anamnese')} className={`py-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'anamnese' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Anamnese</button>
                <button onClick={() => setActiveTab('fotos')} className={`py-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'fotos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Galeria</button>
                <button onClick={() => setActiveTab('historico')} className={`py-4 px-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all ${activeTab === 'historico' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}>Histórico</button>
            </nav>

            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
                <div className="max-w-4xl mx-auto space-y-6 pb-20">
                    
                    {activeTab === 'geral' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                             <Card title="Informações Pessoais" icon={<User size={18} />}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
                                    {!isEditing ? (
                                        <>
                                            <ReadField label="Nome Completo" value={formData.nome} icon={User} span="col-span-full md:col-span-2" />
                                            <ReadField label="Apelido" value={formData.apelido} icon={MessageCircle} />
                                            <ReadField label="CPF" value={formData.cpf} icon={CreditCard} />
                                            <ReadField label="Nascimento" value={formData.nascimento ? `${formData.nascimento} (${clientAge} anos)` : null} icon={Calendar} />
                                            <ReadField label="Sexo" value={formData.sexo} icon={User} />
                                        </>
                                    ) : (
                                        <>
                                            <EditField label="Nome Completo" name="nome" value={formData.nome} onChange={handleInputChange} placeholder="Ex: Maria Souza" span="col-span-full md:col-span-2" />
                                            <EditField label="Apelido" name="apelido" value={formData.apelido} onChange={handleInputChange} placeholder="Como gosta" />
                                            <EditField label="CPF" name="cpf" value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" />
                                            <EditField label="Data Nascimento" name="nascimento" type="date" value={formData.nascimento} onChange={handleInputChange} />
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Sexo</label>
                                                <select name="sexo" value={formData.sexo} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none">
                                                    <option value="">Selecione</option>
                                                    <option value="Feminino">Feminino</option>
                                                    <option value="Masculino">Masculino</option>
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </Card>
                            <Card title="Endereço" icon={<Home size={18} />}>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2">
                                    {!isEditing ? (
                                        <>
                                            <ReadField label="Logradouro" value={formData.endereco} icon={Map} span="col-span-full md:col-span-3" />
                                            <ReadField label="Número" value={formData.numero} icon={Hash} />
                                            <ReadField label="Cidade" value={formData.cidade} icon={Map} />
                                        </>
                                    ) : (
                                        <>
                                            <EditField label="Logradouro" name="endereco" value={formData.endereco} onChange={handleInputChange} span="col-span-full md:col-span-3" />
                                            <EditField label="Número" name="numero" value={formData.numero} onChange={handleInputChange} />
                                            <EditField label="Cidade" name="cidade" value={formData.cidade} onChange={handleInputChange} />
                                        </>
                                    )}
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'anamnese' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <Card title="Ficha de Saúde Estética" icon={<Activity size={18} />}>
                                <div className="space-y-8">
                                    {[
                                        { key: 'has_allergy', label: 'Possui Alguma Alergia?', hasDetails: true, detailKey: 'allergy_details', placeholder: 'Cite substâncias (ex: Glúten, Henna, Ácidos)...' },
                                        { key: 'is_pregnant', label: 'Está Gestante ou Lactante?', hasDetails: false },
                                        { key: 'uses_meds', label: 'Usa Medicamentos Contínuos?', hasDetails: true, detailKey: 'meds_details', placeholder: 'Quais medicamentos?' }
                                    ].map(q => (
                                        <div key={q.key} className="space-y-4 border-b border-slate-50 pb-6 last:border-0">
                                            <div className="flex items-center justify-between">
                                                <p className="font-bold text-slate-700">{q.label}</p>
                                                <ToggleSwitch on={anamnesis[q.key]} onClick={() => setAnamnesis({...anamnesis, [q.key]: !anamnesis[q.key]})} />
                                            </div>
                                            {q.hasDetails && anamnesis[q.key] && (
                                                <div className="animate-in slide-in-from-left-2 duration-300">
                                                    <textarea 
                                                        value={anamnesis[q.detailKey]}
                                                        onChange={(e) => setAnamnesis({...anamnesis, [q.detailKey]: e.target.value})}
                                                        placeholder={q.placeholder}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400"
                                                        rows={2}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações Clínicas / Histórico</label>
                                        <textarea 
                                            value={anamnesis.clinical_notes}
                                            onChange={(e) => setAnamnesis({...anamnesis, clinical_notes: e.target.value})}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-orange-100"
                                            rows={4}
                                            placeholder="Anotações internas sobre a pele ou reações anteriores..."
                                        />
                                    </div>

                                    <div className="pt-6 border-t border-slate-100">
                                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><PenTool size={14}/> Assinatura do Termo de Ciência</h4>
                                        <SignaturePad onSave={(blob) => alert("Assinatura capturada! Clique em Salvar Ficha para finalizar.")} />
                                    </div>
                                    
                                    <button onClick={handleSaveAnamnesis} className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                                        <Save size={18} /> Salvar Ficha de Anamnese
                                    </button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {activeTab === 'fotos' && (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            <header className="flex justify-between items-center">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Timeline de Evolução</h3>
                                <button 
                                    onClick={() => photoInputRef.current?.click()}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-orange-600 flex items-center gap-2 shadow-sm hover:bg-orange-50 transition-all"
                                >
                                    <Plus size={16} /> Adicionar Foto
                                </button>
                                <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                            </header>

                            {photos.length === 0 ? (
                                <div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-slate-100">
                                    <ImageIcon size={48} className="mx-auto text-slate-100 mb-4" />
                                    <p className="text-slate-400 font-bold text-sm">Nenhuma foto registrada para este cliente.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {photos.map(photo => (
                                        <div key={photo.id} className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 group shadow-sm">
                                            <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Evolução" />
                                            <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 backdrop-blur rounded-lg text-[9px] font-black text-slate-800 uppercase shadow-sm">{format(parseISO(photo.created_at), 'dd MMM yy')}</div>
                                            <div className="absolute bottom-3 right-3 flex gap-2 translate-y-10 group-hover:translate-y-0 transition-transform duration-300">
                                                <button onClick={() => setZoomImage(photo.url)} className="p-2 bg-white text-slate-600 rounded-xl shadow-lg hover:text-orange-500"><Maximize2 size={14}/></button>
                                                <button className="p-2 bg-white text-rose-500 rounded-xl shadow-lg hover:bg-rose-50"><Trash2 size={14}/></button>
                                            </div>
                                            <div className="absolute top-3 right-3">
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${photo.type === 'antes' ? 'bg-slate-800 text-white' : 'bg-emerald-500 text-white'}`}>
                                                    {photo.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* LIGHTBOX ZOOM */}
            {zoomImage && (
                <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={() => setZoomImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20"><X size={32}/></button>
                    <img src={zoomImage} className="max-w-full max-h-[90vh] rounded-[40px] shadow-2xl object-contain animate-in zoom-in-95 duration-500" alt="Zoom" />
                </div>
            )}
        </div>
    );
};

export default ClientProfile;
