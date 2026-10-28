import React, { useState, useEffect } from 'react';
import { compressImageFile } from '../../lib/imageCompress';
import { 
  X, Upload, Trash2, Camera, AlertCircle, CheckCircle2, Briefcase, Plus, 
  Image as ImageIcon, ShieldAlert, ShieldCheck, RotateCw, ArrowLeft, UserCheck
} from 'lucide-react';
import { ClassifiedItem, ClassifiedSection, ClassifiedType, PriceType, UserProfile, ClassifiedCategory } from '../../types/database';
import { classifiedsService, authService, checkProfileCompletion } from '../../lib/supabase';

interface ClassifiedFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialData?: ClassifiedItem | null;
  onSuccess: (saved: ClassifiedItem) => void;
  onOpenMyClassifieds?: () => void;
}

export const ClassifiedFormModal: React.FC<ClassifiedFormModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialData,
  onSuccess,
  onOpenMyClassifieds
}) => {
  const [section, setSection] = useState<ClassifiedSection>(initialData?.section || 'produtos_servicos');
  const [type, setType] = useState<ClassifiedType>(initialData?.type || 'vendo');
  const [category, setCategory] = useState(initialData?.category || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [priceType, setPriceType] = useState<PriceType>(initialData?.priceType || 'fixed');
  const [price, setPrice] = useState(initialData?.price !== undefined ? String(initialData.price) : '');
  const [city, setCity] = useState(initialData?.city || 'Estância');
  const [state, setState] = useState(initialData?.state || 'SE');
  const [advertiserName, setAdvertiserName] = useState(initialData?.advertiserName || currentUser.fullName);
  
  const [phone, setPhone] = useState(initialData?.phone || '');
  
  // Imagens: Limite estrito de no máximo 3 fotografias
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Campos específicos de Emprego
  const [jobRole, setJobRole] = useState(initialData?.jobRole || '');
  const [jobArea, setJobArea] = useState(initialData?.jobArea || '');
  const [contractType, setContractType] = useState(initialData?.contractType || 'CLT');
  const [workload, setWorkload] = useState(initialData?.workload || 'Integral');
  const [experience, setExperience] = useState(initialData?.experience || '');
  const [requirements, setRequirements] = useState(initialData?.requirements || '');

  const [categories, setCategories] = useState<ClassifiedCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para preenchimento de perfil obrigatório antes de publicar
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profFullName, setProfFullName] = useState(currentUser?.fullName || '');
  const [profAccountType, setProfAccountType] = useState<'pf' | 'pj'>(currentUser?.accountType || 'pf');
  const [profPhone, setProfPhone] = useState(currentUser?.phone || '');
  const [profCity, setProfCity] = useState(currentUser?.city || 'Estância');
  const [profState, setProfState] = useState(currentUser?.state || 'SE');
  const [profCpf, setProfCpf] = useState(currentUser?.cpf || '');
  const [profCompanyName, setProfCompanyName] = useState(currentUser?.companyName || '');
  const [profCnpj, setProfCnpj] = useState(currentUser?.cnpj || '');
  const [profLegalRep, setProfLegalRep] = useState(currentUser?.legalRepresentative || '');
  const [profTermsAccepted, setProfTermsAccepted] = useState(currentUser?.termsAccepted || false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);

    if (!profFullName.trim()) {
      setProfileError('Por favor, informe seu nome completo.');
      return;
    }
    const cleanPhone = profPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setProfileError('Informe um telefone ou WhatsApp válido com DDD.');
      return;
    }
    if (!profCity.trim()) {
      setProfileError('Informe sua cidade.');
      return;
    }

    if (profAccountType === 'pj') {
      if (!profCompanyName.trim()) {
        setProfileError('Informe a Razão Social da empresa.');
        return;
      }
      const cleanCnpj = profCnpj.replace(/\D/g, '');
      if (cleanCnpj.length !== 14) {
        setProfileError('Informe um CNPJ válido com 14 dígitos.');
        return;
      }
      if (!profLegalRep.trim()) {
        setProfileError('Informe o nome do representante legal.');
        return;
      }
    } else {
      const cleanCpf = profCpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        setProfileError('Informe um CPF válido com 11 dígitos.');
        return;
      }
    }

    if (!profTermsAccepted) {
      setProfileError('É obrigatório aceitar os Termos de Uso e Política de Privacidade.');
      return;
    }

    setProfileSaving(true);
    try {
      const updated = await authService.updateProfile(currentUser.id, {
        fullName: profFullName.trim(),
        accountType: profAccountType,
        phone: profPhone.trim(),
        city: profCity.trim(),
        state: profState.trim(),
        cpf: profAccountType === 'pf' ? profCpf.trim() : undefined,
        companyName: profAccountType === 'pj' ? profCompanyName.trim() : undefined,
        cnpj: profAccountType === 'pj' ? profCnpj.trim() : undefined,
        legalRepresentative: profAccountType === 'pj' ? profLegalRep.trim() : undefined,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: 'v2.1'
      });

      if (updated) {
        setPhone(updated.phone || '');
        setCity(updated.city || 'Estância');
        setAdvertiserName(updated.fullName || '');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Erro ao salvar perfil.');
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    classifiedsService.getCategories(section).then((cats) => {
      setCategories(cats);
      if (!initialData && cats.length > 0) {
        setCategory(cats[0].name);
      }
    });
  }, [section, isOpen, initialData]);

  // O modal continua montado entre aberturas: limpa o aviso do envio anterior para liberar o próximo
  useEffect(() => {
    if (isOpen) {
      setSuccessMessage(null);
      setError(null);
    }
  }, [isOpen]);

  const isJob = section === 'vagas_emprego' || section === 'procuro_emprego';

  // Mudança de seção ajusta o tipo automaticamente
  const handleSectionChange = (newSec: ClassifiedSection) => {
    setSection(newSec);
    if (newSec === 'vagas_emprego') {
      setType('ofereco_vaga');
      setPriceType('negotiable');
    } else if (newSec === 'procuro_emprego') {
      setType('procuro_emprego');
      setPriceType('negotiable');
    } else {
      setType('vendo');
      setPriceType('fixed');
    }
  };

  // Upload de arquivos locais (máximo 3 fotos). As fotos são reduzidas e comprimidas antes do
  // envio: carregam mais rápido e aparecem na prévia do link no WhatsApp (limite ~600 KB).
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    if (images.length + files.length > 3) {
      setError('Limite máximo de 3 fotografias por anúncio excedido.');
      input.value = '';
      return;
    }

    setError(null);
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Apenas arquivos de imagem (JPEG, PNG, WEBP) são permitidos.');
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        setError('O tamanho máximo permitido por foto é de 15MB.');
        continue;
      }
      try {
        const compressed = await compressImageFile(file);
        setImages((prev) => (prev.length >= 3 ? prev : [...prev, compressed]));
      } catch {
        setError('Não foi possível processar uma das fotos. Tente outra imagem.');
      }
    }
    input.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    if (images.length >= 3) {
      setError('Limite máximo de 3 fotografias já atingido.');
      return;
    }
    setImages([...images, imageUrlInput.trim()]);
    setImageUrlInput('');
    setError(null);
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Evita publicar em duplicidade com cliques repetidos enquanto salva ou mostra o aviso de sucesso
    if (loading || successMessage) return;
    setError(null);

    if (!title.trim()) {
      setError('Por favor, informe o título do anúncio.');
      return;
    }
    if (!description.trim()) {
      setError('Por favor, descreva detalhadamente seu anúncio.');
      return;
    }
    if (!phone.trim()) {
      setError('Informe um telefone ou WhatsApp para que os interessados possam entrar em contato.');
      return;
    }

    if (images.length > 3) {
      setError('O anúncio pode conter no máximo 3 fotos.');
      return;
    }

    setLoading(true);

    try {
      const saved = await classifiedsService.saveClassified(
        {
          id: initialData?.id,
          section,
          type,
          category,
          title: title.trim(),
          description: description.trim(),
          priceType: isJob ? priceType : priceType,
          price: priceType === 'fixed' && price ? parseFloat(price) : undefined,
          city: city.trim(),
          state: state.trim(),
          advertiserName: advertiserName.trim(),
          phone: phone.trim(),
          images,
          jobRole: isJob ? jobRole.trim() : undefined,
          jobArea: isJob ? jobArea.trim() : undefined,
          contractType: isJob ? contractType as any : undefined,
          workload: isJob ? workload as any : undefined,
          experience: isJob ? experience.trim() : undefined,
          requirements: isJob ? requirements.trim() : undefined
        },
        currentUser
      );

      const isPending = saved.status === 'pending';
      setSuccessMessage(
        isPending
          ? 'Anúncio enviado com sucesso! Ele foi encaminhado para moderação e estará visível assim que aprovado.'
          : 'Anúncio publicado com sucesso!'
      );

      setTimeout(() => {
        onSuccess(saved);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar anúncio.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !currentUser) return null;

  // BLOQUEIO DE SEGURANÇA: Visitantes sem conta ativa (inativa, suspensa ou bloqueada) não podem publicar
  if (currentUser.status === 'suspended' || currentUser.status === 'blocked' || currentUser.status === 'inactive') {
    const isSuspended = currentUser.status === 'suspended';
    const isInactive = currentUser.status === 'inactive';
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative text-center animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full bg-red-100 text-red-900 text-[10px] font-black uppercase tracking-wider inline-block mb-3">
            {isSuspended ? 'Conta Temporariamente Suspensa' : isInactive ? 'Conta Inativa' : 'Conta Bloqueada por Moderação'}
          </span>

          <h3 className="text-xl font-black uppercase tracking-tight text-gray-900 mb-2">
            Publicação Bloqueada
          </h3>

          <p className="text-sm text-gray-600 leading-relaxed max-w-md mx-auto mb-4">
            {isInactive
              ? 'Sua conta está inativa no sistema. Entre em contato com a equipe para reativar seu acesso.'
              : 'Sua conta está com restrição administrativa e não pode publicar ou gerenciar classificados no momento.'}
          </p>

          {currentUser.moderationReason && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl mb-6 text-xs text-left text-red-900">
              <p className="font-bold uppercase tracking-wider text-[10px] text-red-600 mb-1">Motivo registrado pela moderação:</p>
              <p className="italic">"{currentUser.moderationReason}"</p>
            </div>
          )}

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl mb-6 text-xs text-gray-600 text-left space-y-1">
            <p className="font-bold text-gray-800">Como solicitar revisão da decisão?</p>
            <p>Entre em contato com nossa equipe pelo e-mail <a href="mailto:itallomarketing@gmail.com" className="text-[#0056a4] font-bold underline">itallomarketing@gmail.com</a> ou pelo WhatsApp oficial do portal.</p>
          </div>

          <button
            onClick={() => {
              onClose();
              if (onOpenMyClassifieds) onOpenMyClassifieds();
            }}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para meus classificados
          </button>
        </div>
      </div>
    );
  }

  // BLOQUEIO DE SEGURANÇA: Completar cadastro obrigatório antes de publicar
  const profileStatus = checkProfileCompletion(currentUser);
  if (currentUser.role !== 'admin' && !profileStatus.isComplete) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-gray-100 relative animate-in zoom-in-95 duration-200">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1.5 rounded-full cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-blue-50 text-[#0056a4] rounded-2xl flex items-center justify-center mx-auto mb-3 border border-blue-200 shadow-xs">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-[#0056a4] text-[10px] font-black uppercase tracking-wider inline-block mb-2">
              Segurança dos Classificados
            </span>
            <h3 className="text-xl font-black uppercase tracking-tight text-gray-900">
              Concluir Cadastro Obrigatório
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto mt-2">
              Para publicar anúncios com credibilidade e segurança jurídica para toda a comunidade de leitores, é necessário preencher seus dados básicos de contato e identificação.
            </p>
          </div>

          {profileError && (
            <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tipo de Conta *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="radio"
                    name="modal_prof_account_type"
                    checked={profAccountType === 'pf'}
                    onChange={() => setProfAccountType('pf')}
                    className="text-[#0056a4]"
                  />
                  Pessoa Física (CPF)
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                  <input
                    type="radio"
                    name="modal_prof_account_type"
                    checked={profAccountType === 'pj'}
                    onChange={() => setProfAccountType('pj')}
                    className="text-[#0056a4]"
                  />
                  Pessoa Jurídica (CNPJ)
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {profAccountType === 'pf' ? 'Nome Completo *' : 'Razão Social *'}
              </label>
              <input
                type="text"
                required
                value={profAccountType === 'pf' ? profFullName : profCompanyName}
                onChange={(e) => {
                  if (profAccountType === 'pf') setProfFullName(e.target.value);
                  else setProfCompanyName(e.target.value);
                }}
                placeholder={profAccountType === 'pf' ? 'Seu nome completo' : 'Razão Social da empresa'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
              />
            </div>

            {profAccountType === 'pf' ? (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CPF (apenas números) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={profCpf}
                  onChange={(e) => setProfCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    CNPJ *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={profCnpj}
                    onChange={(e) => setProfCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Representante Legal *
                  </label>
                  <input
                    type="text"
                    required
                    value={profLegalRep}
                    onChange={(e) => setProfLegalRep(e.target.value)}
                    placeholder="Nome do responsável legal"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={profPhone}
                  onChange={(e) => setProfPhone(e.target.value)}
                  placeholder="(79) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cidade *
                </label>
                <input
                  type="text"
                  required
                  value={profCity}
                  onChange={(e) => setProfCity(e.target.value)}
                  placeholder="Estância"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-[#0056a4] outline-none"
                />
              </div>
            </div>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer text-xs text-gray-600">
              <input
                type="checkbox"
                required
                checked={profTermsAccepted}
                onChange={(e) => setProfTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-[#0056a4]"
              />
              <span>
                Li e concordo com os <strong>Termos de Uso</strong> e as <strong>Políticas de Publicação de Anúncios</strong> do portal Folha da Região.
              </span>
            </label>

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full py-3 bg-[#0056a4] hover:bg-[#004482] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {profileSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Salvar Dados e Continuar para o Anúncio</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="px-2.5 py-0.5 rounded bg-blue-50 text-[#0056a4] text-[10px] font-black uppercase tracking-wider">
            Classificados Folha da Região
          </span>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-gray-900 mt-1">
            {initialData ? 'Editar Anúncio' : 'Publicar Novo Anúncio'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Preencha os campos abaixo. Anúncios em conformidade com as regras alcançam milhares de leitores.
          </p>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 mb-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-xs text-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <span className="font-bold">{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. Modalidade Principal */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Modalidade do Anúncio
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSectionChange('produtos_servicos')}
                className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                  section === 'produtos_servicos'
                    ? 'border-[#0056a4] bg-[#0056a4] text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Produtos e Serviços
              </button>
              <button
                type="button"
                onClick={() => handleSectionChange('vagas_emprego')}
                className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                  section === 'vagas_emprego'
                    ? 'border-red-600 bg-red-600 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Vaga de Emprego
              </button>
              <button
                type="button"
                onClick={() => handleSectionChange('procuro_emprego')}
                className={`p-3 rounded-xl border text-xs font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                  section === 'procuro_emprego'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                Procuro Emprego
              </button>
            </div>
          </div>

          {/* 2. Tipo e Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
              >
                {section === 'produtos_servicos' && (
                  <>
                    <option value="vendo">Vendo (Produto à venda)</option>
                    <option value="compro">Compro (Desejo comprar)</option>
                    <option value="alugo">Alugo (Imóvel/Equipamento)</option>
                    <option value="ofereco_servico">Ofereço Serviço</option>
                  </>
                )}
                {section === 'vagas_emprego' && (
                  <option value="ofereco_vaga">Ofereço Vaga de Trabalho</option>
                )}
                {section === 'procuro_emprego' && (
                  <option value="procuro_emprego">Procuro Oportunidade / Emprego</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Categoria
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Título */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Título do Anúncio *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isJob ? 'Ex: Vaga para Vendedor com Experiência' : 'Ex: Smartphone Samsung Galaxy S23 256GB Impecável'}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
            />
          </div>

          {/* 4. Campos Específicos para Emprego / Vagas */}
          {isJob && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <p className="text-xs font-black uppercase tracking-wider text-[#0056a4] flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" /> Detalhes da Oportunidade de Trabalho
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Cargo / Função
                  </label>
                  <input
                    type="text"
                    value={jobRole}
                    onChange={(e) => setJobRole(e.target.value)}
                    placeholder="Ex: Auxiliar de Cozinha"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Área Profissional
                  </label>
                  <input
                    type="text"
                    value={jobArea}
                    onChange={(e) => setJobArea(e.target.value)}
                    placeholder="Ex: Gastronomia e Restaurante"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Tipo de Contratação
                  </label>
                  <select
                    value={contractType}
                    onChange={(e) => setContractType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                  >
                    <option value="CLT">CLT (Carteira Assinada)</option>
                    <option value="PJ">Pessoa Jurídica (PJ)</option>
                    <option value="Estágio">Estágio</option>
                    <option value="Freelancer">Freelancer / Diária</option>
                    <option value="Temporário">Temporário</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Jornada de Trabalho
                  </label>
                  <select
                    value={workload}
                    onChange={(e) => setWorkload(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                  >
                    <option value="Integral">Período Integral</option>
                    <option value="Meio Período">Meio Período</option>
                    <option value="Flexível">Horário Flexível</option>
                    <option value="Remoto">Trabalho Remoto / Home Office</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                  Requisitos ou Experiência Exigida
                </label>
                <input
                  type="text"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="Ex: Ensino Médio Completo, experiência de 6 meses..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>
            </div>
          )}

          {/* 5. Preço / Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Condição do Preço
              </label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
              >
                <option value="fixed">Preço Fixo em Reais (R$)</option>
                <option value="negotiable">A Combinar / A Negociar</option>
                <option value="free">Gratuito / Doação</option>
              </select>
            </div>

            {priceType === 'fixed' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Valor em Reais (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4]"
                />
              </div>
            )}
          </div>

          {/* 6. Descrição */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Descrição Completa do Anúncio *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhes, estado de conservação, formas de entrega, horário de atendimento..."
              className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-[#0056a4] resize-none"
            />
          </div>

          {/* 7. Localização e Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cidade *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Estância"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Estado *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="SE"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                WhatsApp / Telefone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(79) 99999-9999"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
              />
            </div>
          </div>

          {/* 8. Nome do Anunciante */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Nome do Anunciante ou Empresa *
            </label>
            <input
              type="text"
              required
              value={advertiserName}
              onChange={(e) => setAdvertiserName(e.target.value)}
              placeholder="Seu nome ou Razão Social"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
            />
          </div>

          {/* 9. Upload de Fotografias (Máximo 3) */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <label className="block text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#0056a4]" />
                  Fotografias do Anúncio ({images.length} de 3 permitidas)
                </label>
                <p className="text-[11px] text-gray-500">
                  Fotos nítidas aumentam em 4x o interesse dos compradores.
                </p>
              </div>

              {images.length < 3 && (
                <label className="px-3 py-1.5 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Escolher Foto
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Inserir URL alternativa se preferir */}
            {images.length < 3 && (
              <div className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Ou cole o link direto de uma imagem (https://...)"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Adicionar
                </button>
              </div>
            )}

            {/* Pré-visualização com opção de remover */}
            {images.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 bg-gray-900 group">
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-md opacity-90 hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] font-bold text-white">
                      Foto {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-2">
                Nenhuma fotografia adicionada ainda (máximo de 3).
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(successMessage)}
              className="px-6 py-2.5 bg-[#0056a4] hover:bg-[#004482] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Publicando...' : initialData ? 'Salvar Alterações' : 'Publicar Anúncio Agora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
