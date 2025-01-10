import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Container, 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow,
    Typography,
    Box,
    IconButton,
    CircularProgress
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

function App() {
    const [data, setData] = useState([]);
    const [expandedRows, setExpandedRows] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(process.env.REACT_APP_API_URL + '/api/data');
            console.log('Raw API Response:', response.data);
            
            if (!Array.isArray(response.data)) {
                throw new Error('API response is not an array');
            }

            // API yanıtını işle
            const rawData = response.data.map(item => ({
                id: item.id,
                hesap_kodu: item.hesap_kodu,
                hesap_adi: item.hesap_adi,
                toplam_borc: parseFloat(item.borc || 0),
                toplam_alacak: parseFloat(item.alacak || 0)
            }));

            console.log('Processed Raw Data:', rawData);
            const organizedData = organizeData(rawData);
            console.log('Final Organized Data:', organizedData);
            
            setData(organizedData);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Veri yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchData();
    };

    const organizeData = (flatData) => {
        const dataMap = {};
        const result = [];

        // İlk geçiş: Tüm hesapları hazırla
        flatData.forEach(item => {
            const hesapParts = item.hesap_kodu.split('.');
            const isMainAccount = hesapParts.length === 1;
            const mainAccountCode = hesapParts[0];

            const processedItem = {
                ...item,
                children: [],
                level: hesapParts.length - 1
            };

            dataMap[item.hesap_kodu] = processedItem;

            if (isMainAccount) {
                result.push(processedItem);
            } else {
                // Alt hesap ise, ana hesabı bul veya oluştur
                if (!dataMap[mainAccountCode]) {
                    // Ana hesap henüz oluşturulmamışsa oluştur
                    const mainAccount = {
                        hesap_kodu: mainAccountCode,
                        hesap_adi: `Hesap ${mainAccountCode}`,
                        toplam_borc: 0,
                        toplam_alacak: 0,
                        children: [],
                        level: 0
                    };
                    dataMap[mainAccountCode] = mainAccount;
                    result.push(mainAccount);
                }
            }
        });

        // İkinci geçiş: Alt hesapları ana hesaplara bağla
        flatData.forEach(item => {
            const hesapParts = item.hesap_kodu.split('.');
            if (hesapParts.length > 1) {
                const mainAccountCode = hesapParts[0];
                const mainAccount = dataMap[mainAccountCode];
                if (mainAccount) {
                    mainAccount.children.push(dataMap[item.hesap_kodu]);
                    // Ana hesabın toplamlarını güncelle
                    mainAccount.toplam_borc += parseFloat(item.toplam_borc || 0);
                    mainAccount.toplam_alacak += parseFloat(item.toplam_alacak || 0);
                }
            }
        });

        // Sıralama
        result.sort((a, b) => a.hesap_kodu.localeCompare(b.hesap_kodu));
        result.forEach(account => {
            account.children.sort((a, b) => a.hesap_kodu.localeCompare(b.hesap_kodu));
        });

        return result;
    };

    const toggleExpand = (hesapKodu) => {
        setExpandedRows(prev => ({
            ...prev,
            [hesapKodu]: !prev[hesapKodu]
        }));
    };

    const renderRow = (item) => {
        const isExpanded = expandedRows[item.hesap_kodu];
        const hasChildren = item.children && item.children.length > 0;
        const paddingLeft = `${item.level * 20}px`;

        return (
            <React.Fragment key={item.hesap_kodu}>
                <TableRow className={item.level % 2 === 0 ? 'even-row' : 'odd-row'}>
                    <TableCell style={{ paddingLeft }}>
                        {hasChildren && (
                            <button 
                                onClick={() => toggleExpand(item.hesap_kodu)}
                                className="expand-button"
                            >
                                {isExpanded ? '-' : '+'}
                            </button>
                        )}
                        {!hasChildren && <span style={{ marginRight: '24px' }}></span>}
                        {item.hesap_kodu}
                    </TableCell>
                    <TableCell>{item.hesap_adi}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>{item.toplam_borc.toFixed(2)}</TableCell>
                    <TableCell style={{ textAlign: 'right' }}>{item.toplam_alacak.toFixed(2)}</TableCell>
                </TableRow>
                {isExpanded && item.children && item.children.map(child => renderRow(child))}
            </React.Fragment>
        );
    };

    if (loading) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg">
                <Box sx={{ my: 4 }}>
                    <Typography color="error" variant="h6">
                        {error}
                    </Typography>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                    <Typography variant="h4" component="h1">
                        ETahsilat Data Dashboard
                    </Typography>
                    <IconButton 
                        onClick={handleRefresh} 
                        color="primary" 
                        sx={{ ml: 2 }}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                    </IconButton>
                </Box>

                {error && (
                    <Typography color="error" mb={2}>
                        {error}
                    </Typography>
                )}

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Hesap Kodu</TableCell>
                                <TableCell>Hesap Adı</TableCell>
                                <TableCell>Borç</TableCell>
                                <TableCell>Alacak</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.length > 0 ? (
                                data.map(item => renderRow(item))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan="4">No data available</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>
        </Container>
    );
}

export default App;
