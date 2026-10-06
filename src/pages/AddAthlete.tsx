import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useSports } from '../contexts/SportContext';
import { useGroups } from '../hooks/useGroups';
import * as ApiTypes from '../types/api';
import * as Mapper from '../utils/mapper';
import { Card } from '../components/Card';
import { DatePicker } from '../components/DatePicker';
import { ImageCropperModal, type CropSettings } from '../components/ImageCropperModal';
import { getCroppedImg } from '../utils/imageUtils';
import { Camera, X } from 'lucide-react';
import { SearchableSelect, NEW_OPTION_PREFIX } from '../components/SearchableSelect';
import { Loading } from '../components/Loading';
import apiService from '../services/api.service';
import './AddAthlete.css';

export default function AddAthlete() {
  const { addAthlete, updateAthlete, getAthleteById, loading: athletesLoading } = useAthletes();
  const { sports, loadMoreSports, addSport, updateSportInCache, loading: sportsLoading } = useSports();
  const { groups, createGroup, addAthleteToGroup, removeAthleteFromGroup, getGroupForAthlete } = useGroups();
  const navigate = useNavigate();
  const { athleteId } = useParams<{ athleteId: string }>();
  const isEditing = !!athleteId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    sportId: '',
    sportName: '',
    sector: '',
    category: 'Profissional',
    phase: '' as ApiTypes.Phase | '',
    birthDate: '',
    sex: ApiTypes.Sex.Male as ApiTypes.Sex,
    ethnicity: ApiTypes.Ethnicity.Caucasian as ApiTypes.Ethnicity,
  });

  const [groupId, setGroupId] = useState('');
  const [originalGroupId, setOriginalGroupId] = useState('');

  const [profilePhoto, setProfilePhoto] = useState<ApiTypes.ProfilePhotoUpload | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFileName, setCurrentFileName] = useState('profile.jpg');
  const [currentContentType, setCurrentContentType] = useState('image/jpeg');


  useEffect(() => {
    if (isEditing && athleteId) {
      const athlete = getAthleteById(athleteId);
      if (athlete) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resets/derives local state when props change; restructuring would alter render timing
        setFormData({
          name: athlete.fullName,
          sportId: athlete.sportId,
          sportName: athlete.sportName,
          sector: athlete.sector,
          category: athlete.category,
          phase: athlete.phase,
          birthDate: athlete.birthDate.split('T')[0],
          sex: athlete.sex,
          ethnicity: athlete.ethnicity,
        });
        if (athlete.profilePhoto?.accessUrl) {
          setPhotoPreview(athlete.profilePhoto.accessUrl);
        }
        const currentGroup = getGroupForAthlete(athleteId);
        setGroupId(currentGroup?.id || '');
        setOriginalGroupId(currentGroup?.id || '');
      }
    }
  }, [isEditing, athleteId, getAthleteById, getGroupForAthlete]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.sportId) {
      alert('Selecione ou crie um esporte.');
      return;
    }
    if (!formData.sector) {
      alert('Selecione ou crie um setor.');
      return;
    }
    if (!formData.category) {
      alert('Selecione ou crie uma categoria.');
      return;
    }

    setIsSubmitting(true);
    try {
      const existingAthlete = isEditing && athleteId ? getAthleteById(athleteId) : null;
      const stripPrefix = (v: string) => v.startsWith(NEW_OPTION_PREFIX) ? v.slice(NEW_OPTION_PREFIX.length) : v;

      let sportId = formData.sportId;
      const sector = stripPrefix(formData.sector);
      const category = stripPrefix(formData.category);

      if (isNewSport) {
        const createdSport = await apiService.createSport({
          name: formData.sportName,
          sectors: [sector],
          categories: [category],
        });
        sportId = createdSport.id;
        addSport(createdSport);
      } else if (selectedSport) {
        const isNewSector = formData.sector.startsWith(NEW_OPTION_PREFIX);
        const isNewCategory = formData.category.startsWith(NEW_OPTION_PREFIX);
        if (isNewSector || isNewCategory) {
          const updatedSport = await apiService.updateSport(selectedSport.id, {
            id: selectedSport.id,
            name: selectedSport.name,
            sectors: isNewSector ? [...selectedSport.sectors, sector] : selectedSport.sectors,
            categories: isNewCategory ? [...selectedSport.categories, category] : selectedSport.categories,
          });
          updateSportInCache(updatedSport);
        }
      }

      const athleteData: ApiTypes.CreateAthleteCommand = {
        fullName: formData.name,
        sportId,
        sector,
        phase: formData.phase === '' ? ApiTypes.Phase.Competitive : formData.phase,
        category,
        sex: formData.sex,
        ethnicity: formData.ethnicity,
        birthDate: formData.birthDate,
        physicalAssessments: existingAthlete ? existingAthlete.physicalAssessments : [], 
        profilePhoto: profilePhoto,
      };

      let savedAthleteId: string;
      if (isEditing && athleteId) {
        await updateAthlete(athleteId, { ...athleteData, id: athleteId });
        savedAthleteId = athleteId;
      } else {
        savedAthleteId = await addAthlete(athleteData);
      }

      if (groupId.startsWith(NEW_OPTION_PREFIX)) {
        const newGroup = await createGroup(groupId.slice(NEW_OPTION_PREFIX.length));
        await addAthleteToGroup(newGroup.id, savedAthleteId);
      } else if (groupId && groupId !== originalGroupId) {
        await addAthleteToGroup(groupId, savedAthleteId);
      } else if (!groupId && originalGroupId) {
        await removeAthleteFromGroup(originalGroupId, savedAthleteId);
      }

      navigate(-1);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar os dados do atleta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'sportId') {
      const selectedSport = sports.find(s => s.id === value);
      setFormData(prev => ({
        ...prev,
        sportId: value,
        sportName: selectedSport?.name || '',
        sector: '', 
        category: selectedSport?.categories[0] || prev.category
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'phase' ? Number(value) : value
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione apenas arquivos de imagem.');
        return;
      }

      setCurrentFileName(file.name);
      setCurrentContentType(file.type);

      const reader = new FileReader();
      reader.onloadend = () => {
        setImageToCrop(reader.result as string);
        setIsCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (cropSettings: CropSettings) => {
    try {
      const croppedBase64 = await getCroppedImg(
        imageToCrop,
        cropSettings,
        cropSettings.rotation
      );

      setPhotoPreview(croppedBase64);
      setProfilePhoto({
        fileName: currentFileName,
        contentType: currentContentType,
        base64Content: croppedBase64.split(',')[1]
      });
      setIsCropModalOpen(false);
    } catch (e) {
      console.error('Erro ao recortar imagem:', e);
    }
  };

  const removePhoto = () => {
    setPhotoPreview('');
    setProfilePhoto(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedSport = sports.find(s => s.id === formData.sportId);
  const isNewSport = formData.sportId.startsWith(NEW_OPTION_PREFIX);

  if ((athletesLoading && isEditing) || (sportsLoading && sports.length === 0)) {
    return <Loading fullScreen message="Carregando dados..." />;
  }

  return (
    <div className="container add-athlete-container">
      {isSubmitting && <Loading fullScreen message="Salvando atleta..." />}
      <div className="add-athlete-header">
        <h1>{isEditing ? 'Editar Atleta' : 'Adicionar Novo Atleta'}</h1>
        <p>{isEditing ? 'Atualize os dados do atleta no sistema.' : 'Preencha os dados básicos para cadastrar um novo atleta no sistema.'}</p>
      </div>

      <Card className="add-athlete-card">
        <form onSubmit={handleSubmit} className="add-athlete-form">
          <div className="photo-upload-section">
            <div className="photo-upload-container">
              <div className="photo-preview-large">
                {photoPreview ? (
                  <div className="preview-image-wrapper">
                    <img src={photoPreview} alt="Preview" className="preview-image" />
                  </div>
                ) : (
                  <div className="photo-placeholder" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={40} />
                    <span>Carregar Foto</span>
                  </div>
                )}
              </div>
              {photoPreview && (
                <button type="button" className="remove-photo-btn" onClick={removePhoto} title="Remover foto">
                  <X size={16} />
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }} 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Nome Completo</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              placeholder="Ex: João Silva"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupId">Grupo / Time (opcional)</label>
            <SearchableSelect
              options={groups.map(g => ({ id: g.id, name: g.name }))}
              value={groupId}
              onChange={setGroupId}
              placeholder="Sem grupo — atleta avulso"
              noOptionsMessage="Nenhum grupo cadastrado"
              creatable
              createLabel={(term) => `Criar grupo "${term}"`}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sportId">Esporte</label>
              <SearchableSelect
                options={sports.map(s => ({ id: s.id, name: s.name }))}
                value={formData.sportId}
                onChange={(id) => {
                  if (id.startsWith(NEW_OPTION_PREFIX)) {
                    setFormData(prev => ({
                      ...prev,
                      sportId: id,
                      sportName: id.slice(NEW_OPTION_PREFIX.length),
                      sector: '',
                      category: ''
                    }));
                    return;
                  }
                  const selectedSport = sports.find(s => s.id === id);
                  setFormData(prev => ({
                    ...prev,
                    sportId: id,
                    sportName: selectedSport?.name || '',
                    sector: '',
                    category: selectedSport?.categories[0] || prev.category
                  }));
                }}
                onLoadMore={loadMoreSports}
                placeholder="Selecione um esporte"
                creatable
                createLabel={(term) => `Criar esporte "${term}"`}
              />
            </div>

            <div className="form-group">
              <label htmlFor="sector">Setor / Posição</label>
              {isNewSport ? (
                <input
                  type="text"
                  id="sector"
                  name="sector"
                  required
                  placeholder="Ex: Ataque"
                  value={formData.sector}
                  onChange={handleChange}
                />
              ) : (
                <SearchableSelect
                  options={(selectedSport?.sectors ?? []).map(sector => ({ id: sector, name: sector }))}
                  value={formData.sector}
                  onChange={(value) => setFormData(prev => ({ ...prev, sector: value }))}
                  placeholder="Selecione o setor"
                  disabled={!selectedSport}
                  creatable
                  createLabel={(term) => `Criar setor "${term}"`}
                />
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">Categoria</label>
              {isNewSport ? (
                <input
                  type="text"
                  id="category"
                  name="category"
                  required
                  placeholder="Ex: Profissional"
                  value={formData.category}
                  onChange={handleChange}
                />
              ) : (
                <SearchableSelect
                  options={(selectedSport?.categories ?? []).map(cat => ({ id: cat, name: cat }))}
                  value={formData.category}
                  onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  placeholder="Selecione a categoria"
                  disabled={!selectedSport}
                  creatable
                  createLabel={(term) => `Criar categoria "${term}"`}
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="phase">Fase / Objetivo</label>
              <select 
                id="phase" 
                name="phase" 
                required 
                value={formData.phase}
                onChange={handleChange}
              >
                <option value="" disabled>Selecione uma fase</option>
                <option value={ApiTypes.Phase.Competitive}>{Mapper.mapPhaseToLabel(ApiTypes.Phase.Competitive)}</option>
                <option value={ApiTypes.Phase.PreSeason}>{Mapper.mapPhaseToLabel(ApiTypes.Phase.PreSeason)}</option>
                <option value={ApiTypes.Phase.WeightLoss}>{Mapper.mapPhaseToLabel(ApiTypes.Phase.WeightLoss)}</option>
                <option value={ApiTypes.Phase.WeightGain}>{Mapper.mapPhaseToLabel(ApiTypes.Phase.WeightGain)}</option>
                <option value={ApiTypes.Phase.Maintenance}>{Mapper.mapPhaseToLabel(ApiTypes.Phase.Maintenance)}</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="sex">Sexo</label>
              <select id="sex" name="sex" value={formData.sex} onChange={handleChange}>
                <option value={ApiTypes.Sex.Male}>{Mapper.mapSexToLabel(ApiTypes.Sex.Male)}</option>
                <option value={ApiTypes.Sex.Female}>{Mapper.mapSexToLabel(ApiTypes.Sex.Female)}</option>
                <option value={ApiTypes.Sex.Other}>{Mapper.mapSexToLabel(ApiTypes.Sex.Other)}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ethnicity">Raça / Etnia</label>
              <select id="ethnicity" name="ethnicity" value={formData.ethnicity} onChange={handleChange}>
                <option value={ApiTypes.Ethnicity.Caucasian}>{Mapper.mapEthnicityToLabel(ApiTypes.Ethnicity.Caucasian)}</option>
                <option value={ApiTypes.Ethnicity.African}>{Mapper.mapEthnicityToLabel(ApiTypes.Ethnicity.African)}</option>
                <option value={ApiTypes.Ethnicity.Asian}>{Mapper.mapEthnicityToLabel(ApiTypes.Ethnicity.Asian)}</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="birthDate">Data de Nascimento</label>
              <DatePicker 
                id="birthDate" 
                name="birthDate" 
                value={formData.birthDate} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loading size="sm" variant="white" message="" /> : (isEditing ? 'Salvar Alterações' : 'Salvar Atleta')}
            </button>
          </div>
        </form>
      </Card>

      {isCropModalOpen && (
        <ImageCropperModal
          image={imageToCrop}
          onClose={() => setIsCropModalOpen(false)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
